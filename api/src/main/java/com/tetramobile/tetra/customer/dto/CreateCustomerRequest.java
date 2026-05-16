package com.tetramobile.tetra.customer.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCustomerRequest(
        @NotBlank String name,
        @NotBlank String contactInfo,
        @NotBlank String whatsappGroupId
) {}
