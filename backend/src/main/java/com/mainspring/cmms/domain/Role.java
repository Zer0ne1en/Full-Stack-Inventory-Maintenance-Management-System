package com.mainspring.cmms.domain;

/**
 * Application roles. The order matters: {@link #ADMIN} is the most privileged,
 * {@link #VIEWER} the least. Kept as an enum (not a string) so a typo cannot
 * silently grant access.
 */
public enum Role {
    /** Full access: catalogue management, user management, ticket assignment. */
    ADMIN,
    /** Works the tickets assigned to them and logs consumed spare parts. */
    TECHNICIAN,
    /** Read-only: reports, stock levels and audit history. */
    VIEWER;

    public String authority() {
        return "ROLE_" + name();
    }
}
