package com.mainspring.cmms.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Signing configuration for the JSON Web Token issuer.
 *
 * @param secret           HMAC secret, at least 32 bytes. Override in production.
 * @param expirationMinutes access token lifetime
 * @param issuer           value stamped into the {@code iss} claim
 */
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        @NotBlank String secret,
        @Min(1) long expirationMinutes,
        String issuer) {
}
