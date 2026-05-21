package com.tetramobile.tetra.request.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record AddPartRequest(
    @NotBlank String description,
    @NotNull @DecimalMin("0.01") BigDecimal cost
) {}
