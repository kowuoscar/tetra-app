package com.tetramobile.tetra.simcard.dto;

import com.tetramobile.tetra.simcard.model.SimProvider;
import com.tetramobile.tetra.simcard.model.SimType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateSimCardRequest(
        @NotNull SimType type,
        @NotNull @DecimalMin("0") BigDecimal baseMonthlyFee,
        UUID phoneId,
        @NotNull SimProvider provider,
        @NotBlank @Pattern(regexp = "^(\\+33|0033|0)[67]\\d{8}$") String number
) {}
