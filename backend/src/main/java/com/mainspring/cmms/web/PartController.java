package com.mainspring.cmms.web;

import com.mainspring.cmms.service.PartService;
import com.mainspring.cmms.web.dto.PageResponse;
import com.mainspring.cmms.web.dto.PartDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Spare part inventory with search, pagination and low-stock filtering. */
@RestController
@RequestMapping("/api/v1/parts")
@Tag(name = "Spare Parts", description = "Inventory catalogue and stock levels")
public class PartController {

    private final PartService partService;

    public PartController(PartService partService) {
        this.partService = partService;
    }

    @GetMapping
    @Operation(summary = "List parts",
            description = "Server-side pagination. Search by SKU or name, filter by category and low stock.")
    public PageResponse<PartDtos.PartResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean lowStock,
            @PageableDefault(size = 10, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        return partService.search(q, category, lowStock, pageable);
    }

    @GetMapping("/categories")
    @Operation(summary = "Distinct categories", description = "Used to populate the filter dropdown.")
    public List<String> categories() {
        return partService.categories();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Part detail")
    public PartDtos.PartResponse get(@PathVariable Long id) {
        return partService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create part (admin only)")
    public ResponseEntity<PartDtos.PartResponse> create(
            @Valid @RequestBody PartDtos.PartRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(partService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update part (admin only)")
    public PartDtos.PartResponse update(@PathVariable Long id,
                                        @Valid @RequestBody PartDtos.PartRequest request) {
        return partService.update(id, request);
    }

    @PostMapping("/{id}/adjust")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Adjust stock (admin only)",
            description = "Manual receipt, write-off or cycle-count correction. Never allows negative stock.")
    public PartDtos.PartResponse adjust(@PathVariable Long id,
                                        @Valid @RequestBody PartDtos.StockAdjustmentRequest request) {
        return partService.adjustStock(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete part (admin only)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        partService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
