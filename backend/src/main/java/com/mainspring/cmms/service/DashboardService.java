package com.mainspring.cmms.service;

import com.mainspring.cmms.domain.Alert;
import com.mainspring.cmms.domain.Machine;
import com.mainspring.cmms.domain.MachineStatus;
import com.mainspring.cmms.domain.MaintenanceTicket;
import com.mainspring.cmms.domain.SparePart;
import com.mainspring.cmms.domain.TicketStatus;
import com.mainspring.cmms.repository.AlertRepository;
import com.mainspring.cmms.repository.AuditLogRepository;
import com.mainspring.cmms.repository.MachineRepository;
import com.mainspring.cmms.repository.MaintenanceTicketRepository;
import com.mainspring.cmms.repository.SparePartRepository;
import com.mainspring.cmms.web.dto.AlertDtos;
import com.mainspring.cmms.web.dto.AuditDtos;
import com.mainspring.cmms.web.dto.DashboardDtos;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Builds the single aggregate payload behind the dashboard screen. */
@Service
public class DashboardService {

    private static final DateTimeFormatter AXIS_LABEL = DateTimeFormatter.ofPattern("d MMM");
    private static final int TREND_DAYS = 14;

    private final MachineRepository machineRepository;
    private final SparePartRepository partRepository;
    private final MaintenanceTicketRepository ticketRepository;
    private final AlertRepository alertRepository;
    private final AuditLogRepository auditLogRepository;

    public DashboardService(MachineRepository machineRepository,
                            SparePartRepository partRepository,
                            MaintenanceTicketRepository ticketRepository,
                            AlertRepository alertRepository,
                            AuditLogRepository auditLogRepository) {
        this.machineRepository = machineRepository;
        this.partRepository = partRepository;
        this.ticketRepository = ticketRepository;
        this.alertRepository = alertRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public DashboardDtos.DashboardResponse build() {
        long machinesTotal = machineRepository.count();
        long operational = machineRepository.countByStatus(MachineStatus.OPERATIONAL);
        long underMaintenance = machineRepository.countByStatus(MachineStatus.UNDER_MAINTENANCE);
        long outOfService = machineRepository.countByStatus(MachineStatus.OUT_OF_SERVICE);

        List<SparePart> allParts = partRepository.findAll();
        BigDecimal inventoryValue = allParts.stream()
                .map(part -> (part.getUnitPrice() == null ? BigDecimal.ZERO : part.getUnitPrice())
                        .multiply(BigDecimal.valueOf(part.getQuantityOnHand())))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        long lowStockCount = allParts.stream().filter(SparePart::isLowStock).count();

        long open = ticketRepository.countByStatus(TicketStatus.OPEN);
        long inProgress = ticketRepository.countByStatus(TicketStatus.IN_PROGRESS);
        long closed = ticketRepository.countByStatus(TicketStatus.CLOSED);
        long overdue = ticketRepository.countByStatusNot(TicketStatus.CLOSED);

        Map<String, Long> breakdown = new LinkedHashMap<>();
        breakdown.put("OPEN", open);
        breakdown.put("IN_PROGRESS", inProgress);
        breakdown.put("CLOSED", closed);

        double availability = machinesTotal == 0
                ? 0.0
                : Math.round((operational * 10000.0) / machinesTotal) / 100.0;

        return new DashboardDtos.DashboardResponse(
                machinesTotal, operational, underMaintenance, outOfService,
                allParts.size(), lowStockCount, inventoryValue,
                open, inProgress, closed, overdue,
                alertRepository.countByReadAtIsNull(),
                availability,
                breakdown,
                ticketTrend(),
                upcomingServices(),
                allParts.stream().filter(SparePart::isLowStock).limit(5)
                        .map(com.mainspring.cmms.web.dto.PartDtos.PartResponse::from).toList(),
                alertRepository.findByReadAtIsNullOrderByCreatedAtDesc(PageRequest.of(0, 5)).getContent()
                        .stream().map(AlertDtos.AlertResponse::from).toList(),
                auditLogRepository.findAll(PageRequest.of(0, 6,
                        Sort.by(Sort.Direction.DESC, "createdAt"))).getContent()
                        .stream().map(AuditDtos.AuditLogResponse::from).toList());
    }

    /** Opened vs closed ticket counts per day for the last {@value #TREND_DAYS} days. */
    private List<DashboardDtos.TrendPoint> trend() {
        ZoneId zone = ZoneId.systemDefault();
        LocalDate today = LocalDate.now(zone);
        LocalDate start = today.minusDays(TREND_DAYS - 1);

        Map<LocalDate, long[]> buckets = new TreeMap<>();
        for (int i = 0; i < TREND_DAYS; i++) {
            buckets.put(start.plusDays(i), new long[2]);
        }

        for (MaintenanceTicket ticket : ticketRepository.findByOpenedAtGreaterThanEqual(
                start.atStartOfDay(zone).toInstant())) {
            LocalDate day = ticket.getOpenedAt().atZone(zone).toLocalDate();
            long[] bucket = buckets.get(day);
            if (bucket != null) {
                bucket[0]++;
            }
            if (ticket.getClosedAt() != null) {
                LocalDate closedDay = ticket.getClosedAt().atZone(zone).toLocalDate();
                long[] closedBucket = buckets.get(closedDay);
                if (closedBucket != null) {
                    closedBucket[1]++;
                }
            }
        }

        List<DashboardDtos.TrendPoint> points = new ArrayList<>();
        buckets.forEach((date, counts) -> points.add(
                new DashboardDtos.TrendPoint(date.format(AXIS_LABEL), counts[0], counts[1])));
        return points;
    }

    private List<DashboardDtos.TrendPoint> ticketTrend() {
        return trend();
    }

    private List<DashboardDtos.UpcomingService> upcomingServices() {
        LocalDate today = LocalDate.now();
        LocalDate horizon = today.plusDays(30);

        return machineRepository.findAll().stream()
                .filter(machine -> machine.getNextServiceAt() != null
                        && !machine.getNextServiceAt().isAfter(horizon))
                .sorted(Comparator.comparing(Machine::getNextServiceAt))
                .limit(6)
                .map(machine -> new DashboardDtos.UpcomingService(
                        machine.getId(), machine.getName(), machine.getCode(), machine.getLocation(),
                        machine.getNextServiceAt(),
                        ChronoUnit.DAYS.between(today, machine.getNextServiceAt()),
                        ticketRepository.countByMachineIdAndStatusNot(machine.getId(), TicketStatus.CLOSED)))
                .toList();
    }
}
