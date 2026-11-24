package com.mainspring.cmms.web;

import com.mainspring.cmms.domain.TicketPriority;
import com.mainspring.cmms.domain.TicketStatus;
import com.mainspring.cmms.security.SecurityUser;
import com.mainspring.cmms.service.TicketService;
import com.mainspring.cmms.web.dto.PageResponse;
import com.mainspring.cmms.web.dto.TicketDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Maintenance ticket lifecycle, including the transactional stock deduction. */
@RestController
@RequestMapping("/api/v1/tickets")
@Tag(name = "Tickets", description = "Raise, assign, work and close maintenance tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping
    @Operation(summary = "List tickets",
            description = "Server-side pagination with filters: status, priority, machine, technician and "
                    + "free text across title, description and machine name.")
    public PageResponse<TicketDtos.TicketResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) Long machineId,
            @RequestParam(required = false) Long technicianId,
            @PageableDefault(size = 10, sort = "openedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ticketService.search(q, status, priority, machineId, technicianId, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Ticket detail", description = "Includes the consumed-parts ledger.")
    public TicketDtos.TicketResponse get(@PathVariable Long id) {
        return ticketService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Raise a ticket (admin only)")
    public ResponseEntity<TicketDtos.TicketResponse> create(
            @AuthenticationPrincipal SecurityUser principal,
            @Valid @RequestBody TicketDtos.TicketRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ticketService.create(request, principal.getUser()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a ticket (admin only)")
    public TicketDtos.TicketResponse update(@PathVariable Long id,
                                            @Valid @RequestBody TicketDtos.TicketUpdateRequest request) {
        return ticketService.update(id, request, null);
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Assign a technician (admin only)")
    public TicketDtos.TicketResponse assign(@PathVariable Long id,
                                            @RequestBody AssignRequest request) {
        return ticketService.assign(id, request.technicianId());
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    @Operation(summary = "Start work", description = "OPEN -> IN_PROGRESS, claims the ticket for the caller.")
    public TicketDtos.TicketResponse start(@PathVariable Long id,
                                           @AuthenticationPrincipal SecurityUser principal) {
        return ticketService.start(id, principal.getUser());
    }

    @PostMapping("/{id}/parts")
    @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    @Operation(summary = "Log consumed parts",
            description = "Deducts stock inside a single transaction. Fails with 409 and no writes when any "
                    + "part is short.")
    public TicketDtos.TicketResponse logParts(@PathVariable Long id,
                                              @Valid @RequestBody TicketDtos.LogPartsRequest request,
                                              @AuthenticationPrincipal SecurityUser principal) {
        return ticketService.logParts(id, request, principal.getUser());
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    @Operation(summary = "Close a ticket",
            description = "Atomically deducts every listed part, closes the ticket and reschedules the "
                    + "machine's next service. All-or-nothing on 409 INSUFFICIENT_STOCK.")
    public TicketDtos.TicketResponse close(@PathVariable Long id,
                                           @Valid @RequestBody(required = false) TicketDtos.CloseTicketRequest request,
                                           @AuthenticationPrincipal SecurityUser principal) {
        return ticketService.closeTicket(id, request, principal.getUser());
    }

    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reopen a closed ticket (admin only)")
    public TicketDtos.TicketResponse reopen(@PathVariable Long id) {
        return ticketService.reopen(id);
    }

    /** Minimal body for the assign endpoint. */
    public record AssignRequest(Long technicianId) {
    }
}
