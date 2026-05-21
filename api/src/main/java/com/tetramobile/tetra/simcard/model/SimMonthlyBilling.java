package com.tetramobile.tetra.simcard.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "sim_monthly_billing")
@Getter
@Setter
public class SimMonthlyBilling {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "sim_card_id", nullable = false)
    private UUID simCardId;

    @Column(name = "period_month", nullable = false)
    private int periodMonth;

    @Column(name = "period_year", nullable = false)
    private int periodYear;

    @Column(name = "actual_amount", nullable = false)
    private BigDecimal actualAmount;
}
