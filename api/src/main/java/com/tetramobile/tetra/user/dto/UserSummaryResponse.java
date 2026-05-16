package com.tetramobile.tetra.user.dto;

import com.tetramobile.tetra.user.model.User;
import com.tetramobile.tetra.user.model.UserRole;

import java.time.Instant;
import java.util.UUID;

public record UserSummaryResponse(
        UUID id,
        String email,
        String name,
        UserRole role,
        UUID customerId,
        boolean isActive,
        Instant createdAt
) {
    public static UserSummaryResponse from(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole(),
                user.getCustomerId(),
                user.isActive(),
                user.getCreatedAt()
        );
    }
}
