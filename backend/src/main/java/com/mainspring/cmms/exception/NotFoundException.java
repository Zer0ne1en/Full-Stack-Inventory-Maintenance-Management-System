package com.mainspring.cmms.exception;

import org.springframework.http.HttpStatus;

/** 404 — the referenced row does not exist. */
public class NotFoundException extends ApiException {

    public NotFoundException(String entity, Object id) {
        super(HttpStatus.NOT_FOUND, "NOT_FOUND", entity + " with id '" + id + "' was not found");
    }

    public NotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }
}
