package com.mainspring.cmms.domain;

/** The two automated alert families required by the spec, plus manual notices. */
public enum AlertType {
    /** Spare part quantity fell to (or below) its reorder threshold. */
    LOW_STOCK,
    /** A machine reached (or passed) its scheduled service date. */
    SERVICE_DUE,
    /** A ticket breached its target resolution time. */
    TICKET_OVERDUE
}
