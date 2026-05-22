package com.tetramobile.tetra.request.dto;

import com.tetramobile.tetra.request.model.RequestAuthor;
import com.tetramobile.tetra.request.model.RequestStatus;
import com.tetramobile.tetra.request.model.RequestType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RequestSummary(
    UUID id,
    UUID customerId,
    String customerName,
    RequestType type,
    RequestStatus status,
    RequestAuthor author,
    BigDecimal fee,
    Instant createdAt,
    Instant doneAt
) {}
