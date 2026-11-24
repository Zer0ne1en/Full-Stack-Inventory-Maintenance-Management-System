package com.mainspring.cmms.service;

import com.mainspring.cmms.domain.SparePart;
import com.mainspring.cmms.exception.BadRequestException;
import com.mainspring.cmms.exception.ConflictException;
import com.mainspring.cmms.exception.NotFoundException;
import com.mainspring.cmms.repository.SparePartRepository;
import com.mainspring.cmms.repository.TicketPartUsageRepository;
import com.mainspring.cmms.spec.PartSpecifications;
import com.mainspring.cmms.web.dto.PageResponse;
import com.mainspring.cmms.web.dto.PartDtos;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Spare part catalogue plus the guarded stock-adjustment entry points. */
@Service
public class PartService {

    private final SparePartRepository partRepository;
    private final TicketPartUsageRepository usageRepository;
    private final AlertService alertService;
    private final AuditService auditService;

    public PartService(SparePartRepository partRepository,
                       TicketPartUsageRepository usageRepository,
                       AlertService alertService,
                       AuditService auditService) {
        this.partRepository = partRepository;
        this.usageRepository = usageRepository;
        this.alertService = alertService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public PageResponse<PartDtos.PartResponse> search(String query, String category, Boolean lowStock,
                                                      Pageable pageable) {
        Page<SparePart> page = partRepository.findAll(
                PartSpecifications.withFilters(query, category, Boolean.TRUE.equals(lowStock)), pageable);
        return PageResponse.from(page, PartDtos.PartResponse::from);
    }

    @Transactional(readOnly = true)
    public List<String> categories() {
        return partRepository.findDistinctCategories();
    }

    @Transactional(readOnly = true)
    public PartDtos.PartResponse get(Long id) {
        return PartDtos.PartResponse.from(find(id));
    }

    @Transactional
    public PartDtos.PartResponse create(PartDtos.PartRequest request) {
        String sku = request.sku().trim();
        if (partRepository.existsBySkuIgnoreCase(sku)) {
            throw new ConflictException("DUPLICATE_SKU", "A part with SKU '" + sku + "' already exists.");
        }
        SparePart part = new SparePart();
        apply(part, request);
        SparePart saved = partRepository.save(part);
        alertService.evaluateLowStock(saved);
        auditService.log("CREATE", "SparePart", saved.getId(), "Created part " + saved.getSku());
        return PartDtos.PartResponse.from(saved);
    }

    @Transactional
    public PartDtos.PartResponse update(Long id, PartDtos.PartRequest request) {
        SparePart part = find(id);
        String sku = request.sku().trim();
        if (partRepository.existsBySkuIgnoreCaseAndIdNot(sku, id)) {
            throw new ConflictException("DUPLICATE_SKU", "A part with SKU '" + sku + "' already exists.");
        }
        apply(part, request);
        alertService.evaluateLowStock(part);
        auditService.log("UPDATE", "SparePart", id, "Updated part " + part.getSku());
        return PartDtos.PartResponse.from(part);
    }

    /**
     * Manual stock correction (receipts, cycle counts, write-offs).
     * The resulting balance may never drop below zero.
     */
    @Transactional
    public PartDtos.PartResponse adjustStock(Long id, PartDtos.StockAdjustmentRequest request) {
        SparePart part = find(id);
        int delta = request.delta() == null ? 0 : request.delta();
        if (delta == 0) {
            throw new BadRequestException("ZERO_ADJUSTMENT", "Delta must not be zero.");
        }
        int updated = part.getQuantityOnHand() + delta;
        if (updated < 0) {
            throw new BadRequestException("NEGATIVE_STOCK",
                    "Adjustment would leave " + updated + " units on hand. Stock cannot go negative.");
        }
        part.setQuantityOnHand(updated);
        alertService.evaluateLowStock(part);
        auditService.log("ADJUST_STOCK", "SparePart", id,
                "Stock " + (delta > 0 ? "+" : "") + delta + " -> " + updated
                        + (request.reason() == null || request.reason().isBlank()
                        ? "" : " (" + request.reason().trim() + ")"));
        return PartDtos.PartResponse.from(part);
    }

    @Transactional
    public void delete(Long id) {
        SparePart part = find(id);
        long usages = usageRepository.countByTicketPartId(id);
        if (usages > 0) {
            throw new ConflictException("PART_HAS_USAGE_HISTORY",
                    "Part " + part.getSku() + " has consumption history and cannot be deleted. "
                            + "Set its reorder threshold to zero to retire it.");
        }
        partRepository.delete(part);
        auditService.log("DELETE", "SparePart", id, "Deleted part " + part.getSku());
    }

    private SparePart find(Long id) {
        return partRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("SparePart", id));
    }

    private void apply(SparePart part, PartDtos.PartRequest request) {
        part.setSku(request.sku().trim());
        part.setName(request.name().trim());
        part.setDescription(request.description());
        part.setCategory(blankToNull(request.category()));
        part.setUnitOfMeasure(request.unitOfMeasure() == null || request.unitOfMeasure().isBlank()
                ? "pcs" : request.unitOfMeasure().trim());
        part.setQuantityOnHand(request.quantityOnHand());
        part.setReorderThreshold(request.reorderThreshold());
        part.setUnitPrice(request.unitPrice());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
