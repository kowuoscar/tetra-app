package com.tetramobile.tetra.settings.dto;

public record SystemSettingsResponse(
        String bankAccountHolder,
        String bankIban,
        String bankSwift,
        String companyName,
        String companyAddress
) {
}
