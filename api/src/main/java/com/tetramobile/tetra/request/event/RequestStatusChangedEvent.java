package com.tetramobile.tetra.request.event;

import com.tetramobile.tetra.request.model.RequestStatus;

import java.util.UUID;

public record RequestStatusChangedEvent(
    UUID requestId,
    UUID customerId,
    RequestStatus oldStatus,
    RequestStatus newStatus,
    String customerWhatsappGroupId
) {}
