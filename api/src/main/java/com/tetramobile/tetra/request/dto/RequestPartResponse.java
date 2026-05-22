package com.tetramobile.tetra.request.dto;

import com.tetramobile.tetra.request.model.RequestPart;

import java.math.BigDecimal;
import java.util.UUID;

public record RequestPartResponse(UUID id, String description, BigDecimal cost) {
    public static RequestPartResponse from(RequestPart p) {
        return new RequestPartResponse(p.getId(), p.getDescription(), p.getCost());
    }
}
