package com.mainspring.cmms.exception;

import org.springframework.http.HttpStatus;

/** 403 — authenticated but not allowed to perform the action. */
public class ForbiddenException extends ApiException {

    public ForbiddenException(String message) {
        super(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }
}
