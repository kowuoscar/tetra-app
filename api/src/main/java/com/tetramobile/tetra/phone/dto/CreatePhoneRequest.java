package com.tetramobile.tetra.phone.dto;

import com.tetramobile.tetra.phone.model.Ownership;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreatePhoneRequest(
        @NotBlank String model,
        @NotNull Ownership ownership
) {}
