package com.tetramobile.tetra.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        String name,
        @Email String email,
        @Size(min = 8) String password) {
}
