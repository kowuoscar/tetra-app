package com.tetramobile.tetra.request.dto;

import com.tetramobile.tetra.request.model.RequestStatus;

import java.math.BigDecimal;

public record UpdateRequestRequest(
    RequestStatus status,
    String notes,
    BigDecimal fee
) {}
