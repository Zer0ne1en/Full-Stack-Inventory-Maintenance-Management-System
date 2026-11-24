package com.mainspring.cmms.web;

import com.mainspring.cmms.service.DashboardService;
import com.mainspring.cmms.web.dto.DashboardDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The single aggregate call behind the dashboard screen. */
@RestController
@RequestMapping("/api/v1/dashboard")
@Tag(name = "Dashboard", description = "Aggregated plant health metrics")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Dashboard summary", description = "KPIs, ticket trend, low stock and upcoming services.")
    public DashboardDtos.DashboardResponse dashboard() {
        return dashboardService.build();
    }
}
