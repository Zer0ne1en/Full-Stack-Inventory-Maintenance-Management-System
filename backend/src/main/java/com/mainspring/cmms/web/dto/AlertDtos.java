package com.mainspring.cmms.web.dto;

import com.mainspring.cmms.domain.Alert;
import com.mainspring.cmms.domain.AlertSeverity;
import com.mainspring.cmms.domain.AlertType;
import java.time.Instant;

/** Request/response payloads for alerts and notifications. */
public final class AlertDtos {

    private AlertDtos() {
    }

    public record AlertResponse(
            Long id,
            AlertType type,
            AlertSeverity severity,
            String title,
            String message,
            String referenceType,
            Long referenceId,
            String recipientEmail,
            Instant emailedAt,
            Instant readAt,
            boolean unread,
            Instant createdAt) {

        public static AlertResponse from(Alert alert) {
            return new AlertResponse(alert.getId(), alert.getType(), alert.getSeverity(),
                    alert.getTitle(), alert.getMessage(), alert.getReferenceType(), alert.getReferenceId(),
                    alert.getRecipientEmail(), alert.getEmailedAt(), alert.getReadAt(), alert.isUnread(),
                    alert.getCreatedAt());
        }
    }

    public record ScanResult(
            int lowStockAlerts,
            int serviceDueAlerts,
            int overdueTicketAlerts,
            int emailsSent) {
    }
}
