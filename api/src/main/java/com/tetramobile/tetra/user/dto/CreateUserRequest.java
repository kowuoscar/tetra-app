package com.tetramobile.tetra.user.dto;

import com.tetramobile.tetra.user.model.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateUserRequest(
        @NotBlank @Email String email,
        @NotBlank String name,
        @NotBlank @Size(min = 8) String password,
        @NotNull UserRole role,
        UUID customerId) {
}
