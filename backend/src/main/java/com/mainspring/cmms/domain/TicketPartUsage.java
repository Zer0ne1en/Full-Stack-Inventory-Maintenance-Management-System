package com.mainspring.cmms.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * An immutable ledger entry recording that a part was consumed on a ticket.
 *
 * <p>Written in the same transaction as the stock decrement, so the ledger and
 * the inventory balance can never disagree.</p>
 */
@Entity
@Table(name = "ticket_part_usages", indexes = {
        @Index(name = "idx_usage_ticket", columnList = "ticket_id"),
        @Index(name = "idx_usage_part", columnList = "part_id")
})
public class TicketPartUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private MaintenanceTicket ticket;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "part_id", nullable = false)
    private SparePart part;

    @Column(name = "quantity_used", nullable = false)
    private int quantityUsed;

    /** Unit cost captured at the moment of consumption, so historical reports stay accurate. */
    @Column(name = "unit_cost", precision = 12, scale = 2)
    private BigDecimal unitCost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "logged_by_id")
    private User loggedBy;

    @Column(name = "logged_at", nullable = false, updatable = false)
    private Instant loggedAt;

    @PrePersist
    void onCreate() {
        if (loggedAt == null) {
            loggedAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public MaintenanceTicket getTicket() {
        return ticket;
    }

    public void setTicket(MaintenanceTicket ticket) {
        this.ticket = ticket;
    }

    public SparePart getPart() {
        return part;
    }

    public void setPart(SparePart part) {
        this.part = part;
    }

    public int getQuantityUsed() {
        return quantityUsed;
    }

    public void setQuantityUsed(int quantityUsed) {
        this.quantityUsed = quantityUsed;
    }

    public BigDecimal getUnitCost() {
        return unitCost;
    }

    public void setUnitCost(BigDecimal unitCost) {
        this.unitCost = unitCost;
    }

    public User getLoggedBy() {
        return loggedBy;
    }

    public void setLoggedBy(User loggedBy) {
        this.loggedBy = loggedBy;
    }

    public Instant getLoggedAt() {
        return loggedAt;
    }

    public void setLoggedAt(Instant loggedAt) {
        this.loggedAt = loggedAt;
    }
}
