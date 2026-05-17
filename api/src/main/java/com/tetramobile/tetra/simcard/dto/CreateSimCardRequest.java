package com.tetramobile.tetra.simcard.dto;

import com.tetramobile.tetra.simcard.model.SimType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateSimCardRequest(
        @NotNull SimType type,
        @NotNull @DecimalMin("0") BigDecimal baseMonthlyFee,
        UUID phoneId
) {}
