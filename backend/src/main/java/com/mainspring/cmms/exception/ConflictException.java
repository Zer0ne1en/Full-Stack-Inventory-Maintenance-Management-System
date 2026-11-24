package com.mainspring.cmms.exception;

import org.springframework.http.HttpStatus;

/** 409 — the request conflicts with the current state of the resource. */
public class ConflictException extends ApiException {

    public ConflictException(String message) {
        super(HttpStatus.CONFLICT, "CONFLICT", message);
    }

    public ConflictException(String code, String message) {
        super(HttpStatus.CONFLICT, code, message);
    }
}
