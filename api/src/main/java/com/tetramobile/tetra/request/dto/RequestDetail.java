package com.tetramobile.tetra.request.dto;

import com.tetramobile.tetra.request.model.RequestAuthor;
import com.tetramobile.tetra.request.model.RequestStatus;
import com.tetramobile.tetra.request.model.RequestType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RequestDetail(
    UUID id,
    UUID customerId,
    String customerName,
    RequestType type,
    RequestStatus status,
    RequestAuthor author,
    String notes,
    BigDecimal fee,
    UUID phoneId,
    UUID simCardId,
    Instant createdAt,
    Instant updatedAt,
    Instant doneAt,
    List<RequestPartResponse> parts,
    List<AttachmentSummaryResponse> attachments,
    Long timeSpentMinutes
) {}
