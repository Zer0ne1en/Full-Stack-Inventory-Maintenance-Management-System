package com.mainspring.cmms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * General application settings.
 *
 * @param name          product name surfaced in API docs and e-mails
 * @param seedDemoData  when true the bootstrap seeder fills an empty database with sample data
 * @param frontendUrl   used to build deep links inside notification e-mails
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String name,
        boolean seedDemoData,
        String frontendUrl) {
}
