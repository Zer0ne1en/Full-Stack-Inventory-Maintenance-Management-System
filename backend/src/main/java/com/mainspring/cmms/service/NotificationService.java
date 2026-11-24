package com.mainspring.cmms.service;

import com.mainspring.cmms.config.AlertProperties;
import com.mainspring.cmms.config.AppProperties;
import com.mainspring.cmms.domain.Alert;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Sends the alert digest e-mail through {@link JavaMailSender}.
 *
 * <p>Mail is treated as best-effort: a misconfigured SMTP host must never break
 * the transaction that raised the alert, so every failure is logged and swallowed.</p>
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm", Locale.ENGLISH);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final AlertProperties alertProperties;
    private final AppProperties appProperties;

    public NotificationService(ObjectProvider<JavaMailSender> mailSender,
                               AlertProperties alertProperties,
                               AppProperties appProperties) {
        this.mailSender = mailSender;
        this.alertProperties = alertProperties;
        this.appProperties = appProperties;
    }

    /**
     * Sends one digest containing every alert raised by a scan.
     *
     * @return true when an e-mail was actually handed to the mail server
     */
    public boolean sendAlertDigest(List<Alert> alerts) {
        if (alerts == null || alerts.isEmpty()) {
            return false;
        }
        if (!alertProperties.emailEnabled()) {
            return false;
        }
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.info("No JavaMailSender configured (spring.mail.host missing); skipping alert e-mail.");
            return false;
        }
        String recipient = alertProperties.emailRecipient();
        if (recipient == null || recipient.isBlank()) {
            log.info("No app.alerts.email-recipient configured; skipping alert e-mail.");
            return false;
        }

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(alertProperties.emailFrom(), appProperties.name());
            helper.setTo(recipient);
            helper.setSubject(buildSubject(alerts));
            helper.setText(buildBody(alerts), true);
            sender.send(message);

            alerts.forEach(alert -> alert.setEmailedAt(java.time.Instant.now()));
            return true;
        } catch (MessagingException | UnsupportedEncodingException | RuntimeException ex) {
            log.warn("Could not send alert digest to {}: {}", recipient, ex.getMessage());
            return false;
        }
    }

    private String buildSubject(List<Alert> alerts) {
        long critical = alerts.stream().filter(a -> a.getSeverity()
                == com.mainspring.cmms.domain.AlertSeverity.CRITICAL).count();
        if (critical > 0) {
            return String.format("[%s] %d critical alert(s) — action required", appProperties.name(), critical);
        }
        return String.format("[%s] %d new alert(s)", appProperties.name(), alerts.size());
    }

    private String buildBody(List<Alert> alerts) {
        StringBuilder html = new StringBuilder();
        html.append("<div style=\"font-family:Inter,Segoe UI,Arial,sans-serif;max-width:640px;color:#1a1f2b\">");
        html.append("<h2 style=\"margin:0 0 4px;font-size:18px\">").append(escape(appProperties.name()))
                .append(" alert digest</h2>");
        html.append("<p style=\"margin:0 0 20px;color:#6b7280;font-size:13px\">Generated ")
                .append(java.time.ZonedDateTime.now().format(DATE)).append("</p>");
        html.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"border-collapse:collapse;font-size:14px\">");

        for (Alert alert : alerts) {
            String color = switch (alert.getSeverity()) {
                case CRITICAL -> "#c2410c";
                case WARNING -> "#b45309";
                default -> "#1d4ed8";
            };
            html.append("<tr>")
                    .append("<td style=\"padding:12px 0;border-top:1px solid #e5e7eb\">")
                    .append("<div style=\"font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:")
                    .append(color).append(";font-weight:600\">")
                    .append(escape(alert.getSeverity().name())).append(" &middot; ")
                    .append(escape(alert.getType().name().replace('_', ' '))).append("</div>")
                    .append("<div style=\"font-weight:600;margin:4px 0 2px\">").append(escape(alert.getTitle()))
                    .append("</div>")
                    .append("<div style=\"color:#4b5563\">").append(escape(alert.getMessage())).append("</div>")
                    .append("</td></tr>");
        }

        html.append("</table>");
        if (appProperties.frontendUrl() != null && !appProperties.frontendUrl().isBlank()) {
            html.append("<p style=\"margin-top:24px;font-size:13px\"><a style=\"color:#b45309;font-weight:600\" href=\"")
                    .append(escape(appProperties.frontendUrl())).append("/alerts\">Open alert centre &rarr;</a></p>");
        }
        html.append("<p style=\"margin-top:24px;color:#9ca3af;font-size:12px\">")
                .append("You are receiving this because alert e-mail notifications are enabled for this account.")
                .append("</p></div>");
        return html.toString();
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
