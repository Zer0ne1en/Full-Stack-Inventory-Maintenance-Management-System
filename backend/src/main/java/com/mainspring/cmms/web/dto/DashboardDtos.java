package com.mainspring.cmms.web.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Aggregated numbers behind the dashboard screen. */
public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record TrendPoint(String label, long opened, long closed) {
    }

    public record UpcomingService(
            Long machineId,
            String machineName,
            String machineCode,
            String location,
            java.time.LocalDate nextServiceAt,
            long daysUntilDue,
            long openTickets) {
    }

    public record DashboardResponse(
            long machinesTotal,
            long machinesOperational,
            long machinesUnderMaintenance,
            long machinesOutOfService,
            long partsTotal,
            long partsLowStock,
            BigDecimal inventoryValue,
            long ticketsOpen,
            long ticketsInProgress,
            long ticketsClosed,
            long ticketsOverdue,
            long unreadAlerts,
            double fleetAvailability,
            Map<String, Long> ticketStatusBreakdown,
            List<TrendPoint> ticketTrend,
            List<UpcomingService> upcomingServices,
            List<PartDtos.PartResponse> lowStockParts,
            List<AlertDtos.AlertResponse> recentAlerts,
            List<AuditDtos.AuditLogResponse> recentActivity) {
    }
}
