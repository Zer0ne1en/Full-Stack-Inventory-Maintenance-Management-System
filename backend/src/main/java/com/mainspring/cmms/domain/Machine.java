package com.mainspring.cmms.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/** A physical asset on the floor that maintenance tickets are raised against. */
@Entity
@Table(name = "machines")
public class Machine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(length = 120)
    private String manufacturer;

    @Column(length = 120)
    private String model;

    @Column(length = 120)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MachineStatus status = MachineStatus.OPERATIONAL;

    @Column(name = "installed_on")
    private LocalDate installedOn;

    @Column(name = "last_service_at")
    private LocalDate lastServiceAt;

    @Column(name = "next_service_at")
    private LocalDate nextServiceAt;

    @Column(name = "service_interval_days", nullable = false)
    private int serviceIntervalDays = 90;

    @Column(length = 1000)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (status == null) {
            status = MachineStatus.OPERATIONAL;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public void setManufacturer(String manufacturer) {
        this.manufacturer = manufacturer;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public MachineStatus getStatus() {
        return status;
    }

    public void setStatus(MachineStatus status) {
        this.status = status;
    }

    public LocalDate getInstalledOn() {
        return installedOn;
    }

    public void setInstalledOn(LocalDate installedOn) {
        this.installedOn = installedOn;
    }

    public LocalDate getLastServiceAt() {
        return lastServiceAt;
    }

    public void setLastServiceAt(LocalDate lastServiceAt) {
        this.lastServiceAt = lastServiceAt;
    }

    public LocalDate getNextServiceAt() {
        return nextServiceAt;
    }

    public void setNextServiceAt(LocalDate nextServiceAt) {
        this.nextServiceAt = nextServiceAt;
    }

    public int getServiceIntervalDays() {
        return serviceIntervalDays;
    }

    public void setServiceIntervalDays(int serviceIntervalDays) {
        this.serviceIntervalDays = serviceIntervalDays;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
