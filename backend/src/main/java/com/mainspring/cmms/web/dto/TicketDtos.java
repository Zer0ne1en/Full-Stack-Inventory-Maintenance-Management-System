package com.mainspring.cmms.web.dto;

import com.mainspring.cmms.domain.MaintenanceTicket;
import com.mainspring.cmms.domain.TicketPartUsage;
import com.mainspring.cmms.domain.TicketPriority;
import com.mainspring.cmms.domain.TicketStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

/** Request/response payloads for maintenance tickets. */
public final class TicketDtos {

    private TicketDtos() {
    }

    public record TicketRequest(
            @NotBlank(message = "Title is required")
            @Size(max = 150, message = "Title must not exceed 150 characters")
            String title,
            @Size(max = 2000, message = "Description must not exceed 2000 characters")
            String description,
            @NotNull(message = "Machine is required")
            @Positive Long machineId,
            @Positive Long technicianId,
            TicketPriority priority,
            @Size(max = 2000) String resolution) {
    }

    public record TicketUpdateRequest(
            @Size(max = 150) String title,
            @Size(max = 2000) String description,
            @Positive Long technicianId,
            TicketPriority priority,
            TicketStatus status,
            @Positive Long machineId) {
    }

    /** One line of the stock-consumption request body. */
    public record UsageItem(
            @NotNull(message = "Part is required")
            @Positive Long partId,
            @NotNull(message = "Quantity is required")
            @Min(value = 1, message = "Quantity must be at least 1")
            Integer quantity) {
    }

    public record LogPartsRequest(
            @NotEmpty
            @Valid
            List<UsageItem> items,
            @Size(max = 500) String note) {
    }

    public record CloseTicketRequest(
            @Size(max = 2000, message = "Resolution must not exceed 2000 characters")
            String resolution,
            @Valid
            List<UsageItem> items) {
    }

    public record PartUsageResponse(
            Long id,
            Long partId,
            String sku,
            String partName,
            int quantityUsed,
            BigDecimal unitCost,
            BigDecimal lineCost,
            Instant loggedAt,
            String loggedByName) {

        public static PartUsageResponse from(TicketPartUsage usage) {
            BigDecimal unit = usage.getUnitCost() == null ? BigDecimal.ZERO : usage.getUnitCost();
            BigDecimal line = unit.multiply(BigDecimal.valueOf(usage.getQuantityUsed()))
                    .setScale(2, RoundingMode.HALF_UP);
            String logger = usage.getLoggedBy() == null ? null : usage.getLoggedBy().getName();
            return new PartUsageResponse(usage.getId(), usage.getPart().getId(),
                    usage.getPart().getSku(), usage.getPart().getName(), usage.getQuantityUsed(),
                    unit, line, usage.getLoggedAt(), logger);
        }
    }

    public record TicketResponse(
            Long id,
            String ticketCode,
            String title,
            String description,
            TicketStatus status,
            TicketPriority priority,
            MachineDtos.MachineSummary machine,
            AuthDtos.UserSummary assignedTechnician,
            AuthDtos.UserSummary createdBy,
            Instant openedAt,
            Instant closedAt,
            String resolution,
            Instant createdAt,
            Instant updatedAt,
            List<PartUsageResponse> parts) {

        public static TicketResponse from(MaintenanceTicket ticket, List<TicketPartUsage> usages) {
            List<PartUsageResponse> parts = usages == null
                    ? List.of()
                    : usages.stream().map(PartUsageResponse::from).toList();
            return new TicketResponse(ticket.getId(), ticket.getTicketCode(), ticket.getTitle(),
                    ticket.getDescription(), ticket.getStatus(), ticket.getPriority(),
                    MachineDtos.MachineSummary.from(ticket.getMachine()),
                    ticket.getAssignedTechnician() == null ? null
                            : AuthDtos.UserSummary.from(ticket.getAssignedTechnician()),
                    ticket.getCreatedBy() == null ? null : AuthDtos.UserSummary.from(ticket.getCreatedBy()),
                    ticket.getOpenedAt(), ticket.getClosedAt(), ticket.getResolution(),
                    ticket.getCreatedAt(), ticket.getUpdatedAt(), parts);
        }
    }
}
