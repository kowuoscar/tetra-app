package com.tetramobile.tetra.request.event;

import com.tetramobile.tetra.request.model.RequestAuthor;
import com.tetramobile.tetra.request.model.RequestType;

import java.util.UUID;

public record RequestCreatedEvent(
    UUID requestId,
    UUID customerId,
    RequestType requestType,
    RequestAuthor author,
    String customerWhatsappGroupId
) {}
