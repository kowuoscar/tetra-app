package com.tetramobile.tetra.customer.dto;

public record UpdateCustomerRequest(
        String name,
        String contactInfo,
        String whatsappGroupId
) {}
