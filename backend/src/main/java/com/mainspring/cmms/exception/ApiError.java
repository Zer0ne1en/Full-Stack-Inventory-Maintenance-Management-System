package com.mainspring.cmms.exception;

import java.time.Instant;
import java.util.Map;

/**
 * Canonical error payload. Every failure — validation, auth, conflict — uses the
 * same shape so the frontend has exactly one error path to implement.
 */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String path,
        Map<String, String> fieldErrors) {
}
