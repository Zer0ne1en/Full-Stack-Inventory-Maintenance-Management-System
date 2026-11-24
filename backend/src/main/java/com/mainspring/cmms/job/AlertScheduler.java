package com.mainspring.cmms.job;

import com.mainspring.cmms.service.AlertService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodic sweep for low-stock parts, service-due machines and stale tickets.
 *
 * <p>Runs on the cron in {@code app.alerts.cron} (every 15 minutes by default).
 * The scan is also exposed over HTTP so an operator can force it without waiting
 * for the next tick.</p>
 */
@Component
public class AlertScheduler {

    private static final Logger log = LoggerFactory.getLogger(AlertScheduler.class);

    private final AlertService alertService;

    public AlertScheduler(AlertService alertService) {
        this.alertService = alertService;
    }

    @Scheduled(cron = "${app.alerts.cron:0 */15 * * * *}")
    public void scanForAlerts() {
        try {
            var result = alertService.scan();
            if (result.lowStockAlerts() + result.serviceDueAlerts() + result.overdueTicketAlerts() > 0) {
                log.info("Alert scan: {} low stock, {} service due, {} overdue ticket(s), {} e-mail(s) sent",
                        result.lowStockAlerts(), result.serviceDueAlerts(),
                        result.overdueTicketAlerts(), result.emailsSent());
            }
        } catch (RuntimeException ex) {
            log.error("Alert scan failed", ex);
        }
    }
}
