package com.tetramobile.tetra.shared.security;

import com.tetramobile.tetra.user.model.UserRole;

import java.util.UUID;

public record AuthenticatedUser(UUID userId, UserRole role, UUID customerId) {

    public boolean isAdmin() {
        return role == UserRole.admin;
    }

    public boolean isCompany() {
        return role == UserRole.company;
    }

    public boolean isCustomer() {
        return role == UserRole.customer;
    }
}
