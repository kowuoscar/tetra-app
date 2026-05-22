package com.tetramobile.tetra.request.dto;

import com.tetramobile.tetra.request.model.RequestType;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateRequestRequest(
    @NotNull UUID customerId,
    @NotNull RequestType type,
    String notes,
    UUID phoneId,
    UUID simCardId
) {}
