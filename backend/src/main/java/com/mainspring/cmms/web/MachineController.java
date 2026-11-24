package com.mainspring.cmms.web;

import com.mainspring.cmms.domain.MachineStatus;
import com.mainspring.cmms.service.MachineService;
import com.mainspring.cmms.service.TicketService;
import com.mainspring.cmms.web.dto.MachineDtos;
import com.mainspring.cmms.web.dto.PageResponse;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Machine catalogue — searchable, paginated and admin-managed. */
@RestController
@RequestMapping("/api/v1/machines")
@Tag(name = "Machines", description = "Asset register with service schedules")
public class MachineController {

    private final MachineService machineService;
    private final TicketService ticketService;

    public MachineController(MachineService machineService, TicketService ticketService) {
        this.machineService = machineService;
        this.ticketService = ticketService;
    }

    @GetMapping
    @Operation(summary = "List machines",
            description = "Server-side pagination. Filter by free text and operational status.")
    public PageResponse<MachineDtos.MachineResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) MachineStatus status,
            @PageableDefault(size = 10, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        return machineService.search(q, status, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Machine detail")
    public MachineDtos.MachineResponse get(@PathVariable Long id) {
        return machineService.get(id);
    }

    @GetMapping("/{id}/tickets")
    @Operation(summary = "Tickets for a machine")
    public PageResponse<com.mainspring.cmms.web.dto.TicketDtos.TicketResponse> tickets(
            @PathVariable Long id,
            @PageableDefault(size = 10, sort = "openedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ticketService.listByMachine(id, pageable);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create machine (admin only)")
    public ResponseEntity<MachineDtos.MachineResponse> create(
            @Valid @RequestBody MachineDtos.MachineRequest request) {
        MachineDtos.MachineResponse created = machineService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update machine (admin only)")
    public MachineDtos.MachineResponse update(@PathVariable Long id,
                                              @Valid @RequestBody MachineDtos.MachineRequest request) {
        return machineService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete machine (admin only)",
            description = "Rejected with 409 when the machine still has open tickets or history.")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        machineService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
