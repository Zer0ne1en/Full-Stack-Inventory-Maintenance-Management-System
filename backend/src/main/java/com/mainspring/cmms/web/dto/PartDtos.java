package com.mainspring.cmms.web.dto;

import com.mainspring.cmms.domain.SparePart;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

/** Request/response payloads for spare part inventory. */
public final class PartDtos {

    private PartDtos() {
    }

    public record PartRequest(
            @NotBlank(message = "SKU is required")
            @Size(max = 40, message = "SKU must not exceed 40 characters")
            String sku,
            @NotBlank(message = "Name is required")
            @Size(max = 150, message = "Name must not exceed 150 characters")
            String name,
            @Size(max = 1000) String description,
            @Size(max = 80) String category,
            @Size(max = 20) String unitOfMeasure,
            @NotNull(message = "Quantity on hand is required")
            @PositiveOrZero(message = "Quantity cannot be negative")
            Integer quantityOnHand,
            @NotNull(message = "Reorder threshold is required")
            @PositiveOrZero(message = "Reorder threshold cannot be negative")
            Integer reorderThreshold,
            @PositiveOrZero(message = "Unit price cannot be negative")
            BigDecimal unitPrice) {
    }

    public record StockAdjustmentRequest(
            @NotNull(message = "Delta is required")
            Integer delta,
            @Size(max = 500, message = "Reason must not exceed 500 characters")
            String reason) {
    }

    public record PartResponse(
            Long id,
            String sku,
            String name,
            String description,
            String category,
            String unitOfMeasure,
            int quantityOnHand,
            int reorderThreshold,
            BigDecimal unitPrice,
            BigDecimal stockValue,
            boolean lowStock,
            Instant createdAt,
            Instant updatedAt) {

        public static PartResponse from(SparePart part) {
            BigDecimal value = part.getUnitPrice() == null
                    ? BigDecimal.ZERO
                    : part.getUnitPrice().multiply(BigDecimal.valueOf(part.getQuantityOnHand()))
                            .setScale(2, RoundingMode.HALF_UP);
            return new PartResponse(part.getId(), part.getSku(), part.getName(), part.getDescription(),
                    part.getCategory(), part.getUnitOfMeasure(), part.getQuantityOnHand(),
                    part.getReorderThreshold(), part.getUnitPrice(), value, part.isLowStock(),
                    part.getCreatedAt(), part.getUpdatedAt());
        }
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
    }
}
