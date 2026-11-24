package com.mainspring.cmms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Mainspring — Inventory &amp; Maintenance Management System.
 *
 * <p>Entry point for the Spring Boot application. Scheduling is enabled so the
 * alert scanner can poll for low-stock parts and overdue machine services.</p>
 */
@SpringBootApplication
@EnableScheduling
@ConfigurationPropertiesScan
public class CmmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(CmmsApplication.class, args);
    }
}
