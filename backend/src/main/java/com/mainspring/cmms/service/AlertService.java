package com.mainspring.cmms.service;

import com.mainspring.cmms.config.AlertProperties;
import com.mainspring.cmms.domain.Alert;
import com.mainspring.cmms.domain.AlertSeverity;
import com.mainspring.cmms.domain.AlertType;
import com.mainspring.cmms.domain.Machine;
import com.mainspring.cmms.domain.MaintenanceTicket;
import com.mainspring.cmms.domain.SparePart;
import com.mainspring.cmms.domain.TicketStatus;
import com.mainspring.cmms.repository.AlertRepository;
import com.mainspring.cmms.repository.MachineRepository;
import com.mainspring.cmms.repository.MaintenanceTicketRepository;
import com.mainspring.cmms.repository.SparePartRepository;
import com.mainspring.cmms.web.dto.AlertDtos;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The alert engine.
 *
 * <p>Two entry points: {@link #evaluateLowStock} is called inline wherever stock
 * changes so a threshold breach is caught immediately, and {@link #scan} is the
 * scheduled sweep that also covers service intervals and stale tickets.</p>
 *
 * <p>Alerts are de-duplicated by {@code (type, referenceId)} while unread, so a
 * part that stays below its threshold does not spam the feed every 15 minutes.</p>
 */
@Service
public class AlertService {

    private final AlertRepository alertRepository;
    private final SparePartRepository partRepository;
    private final MachineRepository machineRepository;
    private final MaintenanceTicketRepository ticketRepository;
    private final NotificationService notificationService;
    private final AlertProperties properties;

    public AlertService(AlertRepository alertRepository,
                        SparePartRepository partRepository,
                        MachineRepository machineRepository,
                        MaintenanceTicketRepository ticketRepository,
                        NotificationService notificationService,
                        AlertProperties properties) {
        this.alertRepository = alertRepository;
        this.partRepository = partRepository;
        this.machineRepository = machineRepository;
        this.ticketRepository = ticketRepository;
        this.notificationService = notificationService;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public Page<Alert> list(boolean unreadOnly, AlertType type, Pageable pageable) {
        return alertRepository.findAll(
                (root, query, cb) -> {
                    java.util.List<jakarta.persistence.criteria.Predicate> predicates =
                            new java.util.ArrayList<>();
                    if (type != null) {
                        predicates.add(cb.equal(root.get("type"), type));
                    }
                    if (unreadOnly) {
                        predicates.add(cb.isNull(root.get("readAt")));
                    }
                    return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
                },
                pageable);
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return alertRepository.countByReadAtIsNull();
    }

    /** Raises (or refreshes) the low-stock alert for a part. Safe to call repeatedly. */
    @Transactional
    public Alert evaluateLowStock(SparePart part) {
        if (!part.isLowStock()) {
            return null;
        }
        String message = String.format(
                "%s (%s) is down to %d %s — at or below the reorder threshold of %d.",
                part.getName(), part.getSku(), part.getQuantityOnHand(), part.getUnitOfMeasure(),
                part.getReorderThreshold());
        return raise(AlertType.LOW_STOCK, part.isLowStock() && part.getQuantityOnHand() == 0
                        ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                "Low stock: " + part.getName(), message, "SparePart", part.getId());
    }

    /**
     * Sweeps the whole plant. Returns how many alerts of each kind were created,
     * which the admin endpoint surfaces so the scan can be triggered on demand.
     */
    @Transactional
    public AlertDtos.ScanResult scan() {
        List<Alert> created = new ArrayList<>();
        int lowStock = 0;
        int serviceDue = 0;
        int overdue = 0;

        for (SparePart part : partRepository.findAllLowStock()) {
            Alert alert = evaluateLowStock(part);
            if (alert != null) {
                created.add(alert);
                lowStock++;
            }
        }

        LocalDate horizon = LocalDate.now().plusDays(Math.max(0, properties.serviceWindowDays()));
        for (Machine machine : machineRepository.findByNextServiceAtLessThanEqual(horizon)) {
            long days = ChronoUnit.DAYS.between(LocalDate.now(), machine.getNextServiceAt());
            String when = days < 0 ? Math.abs(days) + " day(s) overdue"
                    : days == 0 ? "due today" : "due in " + days + " day(s)";
            String message = machine.getName() + " (" + machine.getCode() + ") has a scheduled service "
                    + when + " — last serviced "
                    + (machine.getLastServiceAt() == null ? "never" : machine.getLastServiceAt()) + ".";
            Alert alert = raise(AlertType.SERVICE_DUE,
                    days < 0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                    "Service due: " + machine.getName(), message, "Machine", machine.getId());
            if (alert != null) {
                created.add(alert);
                serviceDue++;
            }
        }

        Instant threshold = Instant.now().minus(Duration.ofHours(Math.max(1, properties.overdueAfterHours())));
        for (MaintenanceTicket ticket : ticketRepository.findByStatusNotAndOpenedAtBefore(
                TicketStatus.CLOSED, threshold)) {
            long hours = Duration.between(ticket.getOpenedAt(), Instant.now()).toHours();
            String message = String.format(
                    "%s \"%s\" has been %s for %d hour(s) on %s.",
                    ticket.getTicketCode(), ticket.getTitle(),
                    ticket.getStatus().name().toLowerCase().replace('_', ' '),
                    hours, ticket.getMachine().getCode());
            Alert alert = raise(AlertType.TICKET_OVERDUE, AlertSeverity.WARNING,
                    "Stale ticket: " + ticket.getTicketCode(), message,
                    "MaintenanceTicket", ticket.getId());
            if (alert != null) {
                created.add(alert);
                overdue++;
            }
        }

        boolean emailed = notificationService.sendAlertDigest(created);
        return new AlertDtos.ScanResult(lowStock, serviceDue, overdue, emailed ? created.size() : 0);
    }

    @Transactional
    public AlertDtos.AlertResponse markRead(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new com.mainspring.cmms.exception.NotFoundException("Alert", id));
        if (alert.getReadAt() == null) {
            alert.setReadAt(Instant.now());
        }
        return AlertDtos.AlertResponse.from(alert);
    }

    @Transactional
    public long markAllRead() {
        List<Alert> unread = alertRepository.findAll(
                (root, query, cb) -> cb.isNull(root.get("readAt")),
                org.springframework.data.domain.Pageable.unpaged()).getContent();
        Instant now = Instant.now();
        unread.forEach(alert -> alert.setReadAt(now));
        return unread.size();
    }

    private Alert raise(AlertType type, AlertSeverity severity, String title, String message,
                        String referenceType, Long referenceId) {
        if (referenceId != null && alertRepository.existsByTypeAndReferenceIdAndReadAtIsNull(type, referenceId)) {
            return null; // already visible in the feed
        }
        Alert alert = new Alert();
        alert.setType(type);
        alert.setSeverity(severity);
        alert.setTitle(title);
        alert.setMessage(message);
        alert.setReferenceType(referenceType);
        alert.setReferenceId(referenceId);
        alert.setRecipientEmail(properties.emailRecipient());
        return alertRepository.save(alert);
    }
}
