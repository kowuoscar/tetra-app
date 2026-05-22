package com.tetramobile.tetra.request.dto;

import com.tetramobile.tetra.request.model.Attachment;

import java.time.Instant;
import java.util.UUID;

public record AttachmentSummaryResponse(UUID id, UUID uploadedByUserId, Instant createdAt) {
    public static AttachmentSummaryResponse from(Attachment a) {
        return new AttachmentSummaryResponse(a.getId(), a.getUploadedBy(), a.getCreatedAt());
    }
}
