package com.tetramobile.tetra.simcard.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sim_cards")
@Getter
@Setter
public class SimCard {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private SimType type;

    @Column(name = "base_monthly_fee", nullable = false)
    private BigDecimal baseMonthlyFee;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "phone_id")
    private UUID phoneId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private SimStatus status;

    @Column
    @Enumerated(EnumType.STRING)
    private SimProvider provider;

    @Column(length = 20)
    private String number;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
