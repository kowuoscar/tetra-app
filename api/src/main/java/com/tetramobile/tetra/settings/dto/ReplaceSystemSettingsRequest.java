package com.tetramobile.tetra.settings.dto;

import jakarta.validation.constraints.NotBlank;

public record ReplaceSystemSettingsRequest(
        @NotBlank String bankAccountHolder,
        @NotBlank String bankIban,
        @NotBlank String bankSwift,
        @NotBlank String companyName,
        @NotBlank String companyAddress
) {
}
