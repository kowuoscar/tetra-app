package com.tetramobile.tetra.whatsapp;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "whatsapp")
public record WhatsAppProperties(
    String phoneNumberId,
    String apiToken
) {
    public boolean isConfigured() {
        return apiToken != null && !apiToken.isBlank();
    }
}
