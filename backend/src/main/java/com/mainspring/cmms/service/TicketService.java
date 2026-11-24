package com.mainspring.cmms.service;

import com.mainspring.cmms.domain.Machine;
import com.mainspring.cmms.domain.MachineStatus;
import com.mainspring.cmms.domain.MaintenanceTicket;
import com.mainspring.cmms.domain.Role;
import com.mainspring.cmms.domain.SparePart;
import com.mainspring.cmms.domain.TicketPartUsage;
import com.mainspring.cmms.domain.TicketStatus;
import com.mainspring.cmms.domain.User;
import com.mainspring.cmms.exception.BadRequestException;
import com.mainspring.cmms.exception.ConflictException;
import com.mainspring.cmms.exception.ForbiddenException;
import com.mainspring.cmms.exception.InsufficientStockException;
import com.mainspring.cmms.exception.NotFoundException;
import com.mainspring.cmms.repository.AlertRepository;
import com.mainspring.cmms.repository.MachineRepository;
import com.mainspring.cmms.repository.MaintenanceTicketRepository;
import com.mainspring.cmms.repository.SparePartRepository;
import com.mainspring.cmms.repository.TicketPartUsageRepository;
import com.mainspring.cmms.repository.UserRepository;
import com.mainspring.cmms.spec.TicketSpecifications;
import com.mainspring.cmms.web.dto.MachineDtos;
import com.mainspring.cmms.web.dto.PageResponse;
import com.mainspring.cmms.web.dto.TicketDtos;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Maintenance ticket lifecycle.
 *
 * <p>The interesting part is {@link #logParts} and {@link #closeTicket}: both run
 * inside a single database transaction that locks each affected part row, verifies
 * the available quantity, decrements it and writes an immutable usage ledger row.
 * Any failure — a missing part, an invalid quantity, insufficient stock — aborts
 * the whole transaction, so the inventory and the ledger can never disagree.</p>
 */
@Service
public class TicketService {

    private final MaintenanceTicketRepository ticketRepository;
    private final MachineRepository machineRepository;
    private final UserRepository userRepository;
    private final SparePartRepository partRepository;
    private final TicketPartUsageRepository usageRepository;
    private final AlertRepository alertRepository;
    private final AlertService alertService;
    private final AuditService auditService;

    public TicketService(MaintenanceTicketRepository ticketRepository,
                         MachineRepository machineRepository,
                         UserRepository userRepository,
                         SparePartRepository partRepository,
                         TicketPartUsageRepository usageRepository,
                         AlertRepository alertRepository,
                         AlertService alertService,
                         AuditService auditService) {
        this.ticketRepository = ticketRepository;
        this.machineRepository = machineRepository;
        this.userRepository = userRepository;
        this.partRepository = partRepository;
        this.usageRepository = usageRepository;
        this.alertRepository = alertRepository;
        this.alertService = alertService;
        this.auditService = auditService;
    }

    // ---------------------------------------------------------------------
    // Queries
    // ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public PageResponse<TicketDtos.TicketResponse> search(String query, TicketStatus status,
                                                          com.mainspring.cmms.domain.TicketPriority priority,
                                                          Long machineId, Long technicianId,
                                                          Pageable pageable) {
        Specification<MaintenanceTicket> specification = TicketSpecifications.withFilters(
                query, status, priority, machineId, technicianId);
        Page<MaintenanceTicket> page = ticketRepository.findAll(specification, pageable);
        return PageResponse.from(page, ticket -> toResponse(ticket, usagesFor(ticket.getId())));
    }

    @Transactional(readOnly = true)
    public TicketDtos.TicketResponse get(Long id) {
        MaintenanceTicket ticket = find(id);
        return toResponse(ticket, usagesFor(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<TicketDtos.TicketResponse> listByMachine(Long machineId, Pageable pageable) {
        Page<MaintenanceTicket> page = ticketRepository.findByMachineId(machineId, pageable);
        return PageResponse.from(page, ticket -> toResponse(ticket, usagesFor(ticket.getId())));
    }

    // ---------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------

    @Transactional
    public TicketDtos.TicketResponse create(TicketDtos.TicketRequest request, User actor) {
        Machine machine = machineRepository.findById(request.machineId())
                .orElseThrow(() -> new NotFoundException("Machine", request.machineId()));

        MaintenanceTicket ticket = new MaintenanceTicket();
        ticket.setTitle(request.title().trim());
        ticket.setDescription(request.description());
        ticket.setMachine(machine);
        ticket.setCreatedBy(actor);
        ticket.setPriority(request.priority() == null
                ? com.mainspring.cmms.domain.TicketPriority.MEDIUM : request.priority());
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setOpenedAt(Instant.now());
        ticket.setTicketCode(nextTicketCode());

        if (request.technicianId() != null) {
            ticket.setAssignedTechnician(resolveTechnician(request.technicianId()));
        }

        MaintenanceTicket saved = ticketRepository.save(ticket);

        if (machine.getStatus() == MachineStatus.OPERATIONAL) {
            machine.setStatus(MachineStatus.UNDER_MAINTENANCE);
        }

        auditService.log("CREATE", "MaintenanceTicket", saved.getId(),
                "Opened ticket " + saved.getTicketCode() + " on " + machine.getCode());
        return toResponse(saved, List.of());
    }

    @Transactional
    public TicketDtos.TicketResponse update(Long id, TicketDtos.TicketUpdateRequest request, User actor) {
        MaintenanceTicket ticket = find(id);
        StringBuilder changes = new StringBuilder();

        if (request.title() != null && !request.title().isBlank()) {
            ticket.setTitle(request.title().trim());
            changes.append("title; ");
        }
        if (request.description() != null) {
            ticket.setDescription(request.description());
            changes.append("description; ");
        }
        if (request.priority() != null) {
            ticket.setPriority(request.priority());
            changes.append("priority=").append(request.priority()).append("; ");
        }
        if (request.machineId() != null && !request.machineId().equals(ticket.getMachine().getId())) {
            Machine machine = machineRepository.findById(request.machineId())
                    .orElseThrow(() -> new NotFoundException("Machine", request.machineId()));
            ticket.setMachine(machine);
            changes.append("machine=").append(machine.getCode()).append("; ");
        }
        if (request.technicianId() != null) {
            ticket.setAssignedTechnician(resolveTechnician(request.technicianId()));
            changes.append("assignee=").append(ticket.getAssignedTechnician().getName()).append("; ");
        }
        if (request.status() != null && request.status() != ticket.getStatus()) {
            if (request.status() == TicketStatus.CLOSED) {
                throw new BadRequestException("USE_CLOSE_ENDPOINT",
                        "Use POST /api/v1/tickets/{id}/close so consumed stock is deducted atomically.");
            }
            ticket.setStatus(request.status());
            changes.append("status=").append(request.status()).append("; ");
        }

        auditService.log("UPDATE", "MaintenanceTicket", id, changes.toString());
        return toResponse(ticket, usagesFor(id));
    }

    @Transactional
    public TicketDtos.TicketResponse assign(Long id, Long technicianId) {
        MaintenanceTicket ticket = find(id);
        ticket.setAssignedTechnician(resolveTechnician(technicianId));
        auditService.log("ASSIGN", "MaintenanceTicket", id,
                "Assigned " + ticket.getTicketCode() + " to " + ticket.getAssignedTechnician().getName());
        return toResponse(ticket, usagesFor(id));
    }

    /**
     * Starts work on a ticket (OPEN -> IN_PROGRESS) and marks the assignee.
     */
    @Transactional
    public TicketDtos.TicketResponse start(Long id, User actor) {
        MaintenanceTicket ticket = find(id);
        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new ConflictException("TICKET_CLOSED", "Ticket " + ticket.getTicketCode() + " is already closed.");
        }
        assertCanWorkOn(ticket, actor);
        if (ticket.getAssignedTechnician() == null) {
            ticket.setAssignedTechnician(actor);
        }
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        auditService.log("START", "MaintenanceTicket", id, "Started " + ticket.getTicketCode());
        return toResponse(ticket, usagesFor(id));
    }

    /**
     * Logs parts consumed while the ticket is still open. Stock is deducted
     * immediately, inside the same transaction as the ledger write.
     */
    @Transactional
    public TicketDtos.TicketResponse logParts(Long id, TicketDtos.LogPartsRequest request, User actor) {
        MaintenanceTicket ticket = find(id);
        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new ConflictException("TICKET_CLOSED",
                    "Ticket " + ticket.getTicketCode() + " is closed; reopen it before logging more parts.");
        }
        assertCanWorkOn(ticket, actor);

        List<TicketPartUsage> usages = consumeStock(ticket, request.items(), actor);
        usages.forEach(usageRepository::save);
        auditService.log("LOG_PARTS", "MaintenanceTicket", id,
                "Logged " + usages.size() + " part line(s) on " + ticket.getTicketCode());

        if (ticket.getStatus() == TicketStatus.OPEN) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }
        return toResponse(ticket, usagesFor(id));
    }

    /**
     * Closes a ticket and deducts every part listed in the same request.
     *
     * <p>This is the transaction the spec asks for: if any part is short the whole
     * call fails with 409 and nothing is written — no partial deduction, no closed
     * ticket, no ledger row.</p>
     */
    @Transactional
    public TicketDtos.TicketResponse closeTicket(Long id, TicketDtos.CloseTicketRequest request, User actor) {
        MaintenanceTicket ticket = find(id);
        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new ConflictException("TICKET_CLOSED", "Ticket " + ticket.getTicketCode() + " is already closed.");
        }
        assertCanWorkOn(ticket, actor);

        List<TicketPartUsage> usages = consumeStock(ticket, request == null ? null : request.items(), actor);
        usages.forEach(usageRepository::save);

        ticket.setStatus(TicketStatus.CLOSED);
        ticket.setClosedAt(Instant.now());
        ticket.setResolution(request == null ? null : request.resolution());

        Machine machine = ticket.getMachine();
        machine.setLastServiceAt(LocalDate.now());
        if (machine.getServiceIntervalDays() > 0) {
            machine.setNextServiceAt(LocalDate.now().plusDays(machine.getServiceIntervalDays()));
        }
        if (ticketRepository.countByMachineIdAndStatusNot(machine.getId(), TicketStatus.CLOSED) == 0) {
            machine.setStatus(MachineStatus.OPERATIONAL);
        }

        auditService.log("CLOSE", "MaintenanceTicket", id,
                "Closed " + ticket.getTicketCode() + " with " + usages.size() + " part line(s)");
        return toResponse(ticket, usagesFor(id));
    }

    @Transactional
    public TicketDtos.TicketResponse reopen(Long id) {
        MaintenanceTicket ticket = find(id);
        if (ticket.getStatus() != TicketStatus.CLOSED) {
            throw new ConflictException("TICKET_NOT_CLOSED", "Only closed tickets can be reopened.");
        }
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setClosedAt(null);
        ticket.setResolution(null);
        ticket.getMachine().setStatus(MachineStatus.UNDER_MAINTENANCE);
        auditService.log("REOPEN", "MaintenanceTicket", id, "Reopened " + ticket.getTicketCode());
        return toResponse(ticket, usagesFor(id));
    }

    // ---------------------------------------------------------------------
    // Stock consumption — the transactional core
    // ---------------------------------------------------------------------

    /**
     * Locks, validates and decrements stock for each requested part.
     *
     * @throws InsufficientStockException when any line cannot be satisfied
     */
    private List<TicketPartUsage> consumeStock(MaintenanceTicket ticket,
                                               List<TicketDtos.UsageItem> items,
                                               User actor) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }

        // Merge duplicate part lines so a request for 2 + 3 of the same SKU is one 5-unit deduction.
        Map<Long, Integer> requestedByPart = new LinkedHashMap<>();
        for (TicketDtos.UsageItem item : items) {
            if (item == null || item.partId() == null || item.quantity() == null) {
                throw new BadRequestException("INVALID_USAGE_LINE", "Each usage line needs a partId and a quantity.");
            }
            if (item.quantity() < 1) {
                throw new BadRequestException("INVALID_QUANTITY", "Part quantity must be at least 1.");
            }
            requestedByPart.merge(item.partId(), item.quantity(), Integer::sum);
        }

        List<TicketPartUsage> usages = new ArrayList<>();
        for (Map.Entry<Long, Integer> entry : requestedByPart.entrySet()) {
            // SELECT ... FOR UPDATE — serialises concurrent deductions on the same part.
            SparePart part = partRepository.findByIdForUpdate(entry.getKey())
                    .orElseThrow(() -> new NotFoundException("SparePart", entry.getKey()));

            int requested = entry.getValue();
            int available = part.getQuantityOnHand();
            if (available < requested) {
                throw new InsufficientStockException(part.getSku(), part.getName(), requested, available);
            }

            part.setQuantityOnHand(available - requested);

            TicketPartUsage usage = new TicketPartUsage();
            usage.setTicket(ticket);
            usage.setPart(part);
            usage.setQuantityUsed(requested);
            usage.setUnitCost(part.getUnitPrice());
            usage.setLoggedBy(actor);
            usage.setLoggedAt(Instant.now());
            usages.add(usage);

            alertService.evaluateLowStock(part);
        }
        return usages;
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private void assertCanWorkOn(MaintenanceTicket ticket, User actor) {
        if (actor.getRole() == Role.ADMIN) {
            return;
        }
        if (actor.getRole() != Role.TECHNICIAN) {
            throw new ForbiddenException("Only technicians can update maintenance tickets.");
        }
        User assignee = ticket.getAssignedTechnician();
        if (assignee == null || !assignee.getId().equals(actor.getId())) {
            throw new ForbiddenException("This ticket is assigned to another technician.");
        }
    }

    private User resolveTechnician(Long technicianId) {
        User technician = userRepository.findById(technicianId)
                .orElseThrow(() -> new NotFoundException("Technician", technicianId));
        if (technician.getRole() == Role.VIEWER) {
            throw new BadRequestException("INVALID_TECHNICIAN", "A viewer cannot be assigned maintenance work.");
        }
        if (!technician.isEnabled()) {
            throw new BadRequestException("TECHNICIAN_DISABLED", "That technician account is disabled.");
        }
        return technician;
    }

    private MaintenanceTicket find(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("MaintenanceTicket", id));
    }

    private List<TicketPartUsage> usagesFor(Long ticketId) {
        return usageRepository.findByTicketIdOrderByLoggedAtAsc(ticketId);
    }

    private TicketDtos.TicketResponse toResponse(MaintenanceTicket ticket, List<TicketPartUsage> usages) {
        return TicketDtos.TicketResponse.from(ticket, usages);
    }

    /** {@code TKT-2026-0007} — readable, sortable, and unique per database. */
    private String nextTicketCode() {
        int year = LocalDate.now().getYear();
        long sequence = ticketRepository.count() + 1;
        return String.format("TKT-%d-%04d", year, sequence);
    }
}
