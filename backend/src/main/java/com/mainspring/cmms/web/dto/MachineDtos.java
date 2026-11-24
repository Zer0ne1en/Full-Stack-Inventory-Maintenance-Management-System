package com.mainspring.cmms.web.dto;

import com.mainspring.cmms.domain.Machine;
import com.mainspring.cmms.domain.MachineStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;

/** Request/response payloads for the machine catalogue. */
public final class MachineDtos {

    private MachineDtos() {
    }

    public record MachineRequest(
            @NotBlank(message = "Name is required")
            @Size(max = 120, message = "Name must not exceed 120 characters")
            String name,
            @NotBlank(message = "Code is required")
            @Size(max = 40, message = "Code must not exceed 40 characters")
            String code,
            @Size(max = 120) String manufacturer,
            @Size(max = 120) String model,
            @Size(max = 120) String location,
            MachineStatus status,
            LocalDate installedOn,
            LocalDate lastServiceAt,
            LocalDate nextServiceAt,
            @PositiveOrZero(message = "Service interval must be zero or more days")
            Integer serviceIntervalDays,
            @Size(max = 1000, message = "Notes must not exceed 1000 characters")
            String notes) {
    }

    public record MachineResponse(
            Long id,
            String name,
            String code,
            String manufacturer,
            String model,
            String location,
            MachineStatus status,
            LocalDate installedOn,
            LocalDate lastServiceAt,
            LocalDate nextServiceAt,
            int serviceIntervalDays,
            String notes,
            Instant createdAt,
            Instant updatedAt,
            long openTickets,
            boolean serviceDue) {

        public static MachineResponse from(Machine machine, long openTickets) {
            boolean due = machine.getNextServiceAt() != null
                    && !machine.getNextServiceAt().isAfter(LocalDate.now());
            return new MachineResponse(machine.getId(), machine.getName(), machine.getCode(),
                    machine.getManufacturer(), machine.getModel(), machine.getLocation(),
                    machine.getStatus(), machine.getInstalledOn(), machine.getLastServiceAt(),
                    machine.getNextServiceAt(), machine.getServiceIntervalDays(), machine.getNotes(),
                    machine.getCreatedAt(), machine.getUpdatedAt(), openTickets, due);
        }
    }

    /** Compact projection used inside ticket and dashboard payloads. */
    public record MachineSummary(
            Long id,
            String name,
            String code,
            String location,
            MachineStatus status,
            LocalDate nextServiceAt) {

        public static MachineSummary from(Machine machine) {
            return new MachineSummary(machine.getId(), machine.getName(), machine.getCode(),
                    machine.getLocation(), machine.getStatus(), machine.getNextServiceAt());
        }
    }
}
