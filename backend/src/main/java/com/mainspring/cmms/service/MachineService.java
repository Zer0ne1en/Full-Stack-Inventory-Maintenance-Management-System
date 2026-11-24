package com.mainspring.cmms.service;

import com.mainspring.cmms.domain.Machine;
import com.mainspring.cmms.domain.MachineStatus;
import com.mainspring.cmms.domain.TicketStatus;
import com.mainspring.cmms.exception.ConflictException;
import com.mainspring.cmms.exception.NotFoundException;
import com.mainspring.cmms.repository.MachineRepository;
import com.mainspring.cmms.repository.MaintenanceTicketRepository;
import com.mainspring.cmms.spec.MachineSpecifications;
import com.mainspring.cmms.web.dto.MachineDtos;
import com.mainspring.cmms.web.dto.PageResponse;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** CRUD, search and service-schedule handling for machines. */
@Service
public class MachineService {

    private final MachineRepository machineRepository;
    private final MaintenanceTicketRepository ticketRepository;
    private final AuditService auditService;

    public MachineService(MachineRepository machineRepository,
                          MaintenanceTicketRepository ticketRepository,
                          AuditService auditService) {
        this.machineRepository = machineRepository;
        this.ticketRepository = ticketRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public PageResponse<MachineDtos.MachineResponse> search(String query, MachineStatus status, Pageable pageable) {
        Page<Machine> page = machineRepository.findAll(
                MachineSpecifications.withFilters(query, status), pageable);
        Map<Long, Long> openTickets = openTicketCounts();
        return PageResponse.from(page,
                machine -> MachineDtos.MachineResponse.from(machine,
                        openTickets.getOrDefault(machine.getId(), 0L)));
    }

    @Transactional(readOnly = true)
    public MachineDtos.MachineResponse get(Long id) {
        Machine machine = find(id);
        long open = ticketRepository.countByMachineIdAndStatusNot(id,
                TicketStatus.CLOSED);
        return MachineDtos.MachineResponse.from(machine, open);
    }

    @Transactional
    public MachineDtos.MachineResponse create(MachineDtos.MachineRequest request) {
        String code = request.code().trim();
        if (machineRepository.existsByCodeIgnoreCase(code)) {
            throw new ConflictException("DUPLICATE_CODE", "A machine with code '" + code + "' already exists.");
        }

        Machine machine = new Machine();
        apply(machine, request);
        machine.setStatus(request.status() == null ? MachineStatus.OPERATIONAL : request.status());
        machine.setServiceIntervalDays(request.serviceIntervalDays() == null
                ? 90 : request.serviceIntervalDays());

        Machine saved = machineRepository.save(machine);
        auditService.log("CREATE", "Machine", saved.getId(), "Created machine " + saved.getCode());
        return MachineDtos.MachineResponse.from(saved, 0);
    }

    @Transactional
    public MachineDtos.MachineResponse update(Long id, MachineDtos.MachineRequest request) {
        Machine machine = find(id);
        String code = request.code().trim();
        if (machineRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new ConflictException("DUPLICATE_CODE", "A machine with code '" + code + "' already exists.");
        }
        apply(machine, request);
        if (request.status() != null) {
            machine.setStatus(request.status());
        }
        if (request.serviceIntervalDays() != null) {
            machine.setServiceIntervalDays(request.serviceIntervalDays());
        }
        auditService.log("UPDATE", "Machine", id, "Updated machine " + machine.getCode());
        return get(id);
    }

    @Transactional
    public void delete(Long id) {
        Machine machine = find(id);
        long openTickets = ticketRepository.countByMachineIdAndStatusNot(id,
                TicketStatus.CLOSED);
        if (openTickets > 0) {
            throw new ConflictException("MACHINE_HAS_OPEN_TICKETS",
                    "Machine " + machine.getCode() + " still has " + openTickets
                            + " open ticket(s). Close or reassign them first.");
        }
        if (ticketRepository.countByMachineId(id) > 0) {
            throw new ConflictException("MACHINE_HAS_HISTORY",
                    "Machine " + machine.getCode() + " has maintenance history and cannot be deleted. "
                            + "Set its status to OUT_OF_SERVICE instead.");
        }
        machineRepository.delete(machine);
        auditService.log("DELETE", "Machine", id, "Deleted machine " + machine.getCode());
    }

    private Machine find(Long id) {
        return machineRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Machine", id));
    }

    private void apply(Machine machine, MachineDtos.MachineRequest request) {
        machine.setName(request.name().trim());
        machine.setCode(request.code().trim());
        machine.setManufacturer(blankToNull(request.manufacturer()));
        machine.setModel(blankToNull(request.model()));
        machine.setLocation(blankToNull(request.location()));
        machine.setInstalledOn(request.installedOn());
        machine.setLastServiceAt(request.lastServiceAt());
        machine.setNextServiceAt(request.nextServiceAt());
        machine.setNotes(blankToNull(request.notes()));

        if (machine.getNextServiceAt() == null && machine.getServiceIntervalDays() > 0
                && machine.getLastServiceAt() != null) {
            machine.setNextServiceAt(machine.getLastServiceAt().plusDays(machine.getServiceIntervalDays()));
        }
    }

    private Map<Long, Long> openTicketCounts() {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : ticketRepository.countOpenTicketsByMachine()) {
            counts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return counts.isEmpty() ? Collections.emptyMap() : counts;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
