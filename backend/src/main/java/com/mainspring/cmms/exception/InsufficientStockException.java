package com.mainspring.cmms.exception;

import org.springframework.http.HttpStatus;

/**
 * 409 — raised when a ticket tries to consume more units than are available.
 *
 * <p>Thrown from inside the {@code @Transactional} stock-deduction service, so
 * the whole ticket update rolls back and the ledger stays consistent.</p>
 */
public class InsufficientStockException extends ApiException {

    public InsufficientStockException(String sku, String partName, int requested, int available) {
        super(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK",
                "Insufficient stock for " + partName + " (" + sku + "): requested "
                        + requested + ", only " + available + " available");
    }
}
