package com.mainspring.cmms.web;

import com.mainspring.cmms.domain.AlertType;
import com.mainspring.cmms.service.AlertService;
import com.mainspring.cmms.web.dto.AlertDtos;
import com.mainspring.cmms.web.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Alert feed and the on-demand scanner. */
@RestController
@RequestMapping("/api/v1/alerts")
@Tag(name = "Alerts", description = "Low-stock, service-due and stale-ticket notifications")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    @Operation(summary = "List alerts", description = "Newest first, paginated.")
    public PageResponse<AlertDtos.AlertResponse> list(
            @RequestParam(required = false, defaultValue = "false") boolean unreadOnly,
            @RequestParam(required = false) AlertType type,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return PageResponse.from(alertService.list(unreadOnly, type, pageable),
                AlertDtos.AlertResponse::from);
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Unread alert count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", alertService.unreadCount());
    }

    @PostMapping("/scan")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Run the alert scan now (admin only)",
            description = "Same job the scheduler runs every 15 minutes; useful for demos and tests.")
    public AlertDtos.ScanResult scan() {
        return alertService.scan();
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark one alert as read")
    public AlertDtos.AlertResponse markRead(@PathVariable Long id) {
        return alertService.markRead(id);
    }

    @PostMapping("/read-all")
    @Operation(summary = "Mark every alert as read")
    public Map<String, Long> markAllRead() {
        return Map.of("updated", alertService.markAllRead());
    }
}
