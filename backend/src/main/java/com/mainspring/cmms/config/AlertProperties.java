package com.mainspring.cmms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Tunables for the automated alert engine.
 *
 * @param cron                Spring cron expression for the periodic scan
 * @param emailEnabled        when false the mail transport is never touched (useful for local dev)
 * @param emailRecipient      address that receives alert digests
 * @param emailFrom           value for the {@code From} header
 * @param overdueAfterHours   a ticket still open after this many hours raises a TICKET_OVERDUE alert
 * @param serviceWindowDays   machines due within this many days are treated as "due now"
 */
@ConfigurationProperties(prefix = "app.alerts")
public record AlertProperties(
        String cron,
        boolean emailEnabled,
        String emailRecipient,
        String emailFrom,
        int overdueAfterHours,
        int serviceWindowDays) {
}
