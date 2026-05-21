package com.tetramobile.tetra.simcard.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record MonthlyBillingRequest(
        @NotNull @Min(1) @Max(12) Integer periodMonth,
        @NotNull Integer periodYear,
        @NotNull @DecimalMin("0") BigDecimal actualAmount
) {}
