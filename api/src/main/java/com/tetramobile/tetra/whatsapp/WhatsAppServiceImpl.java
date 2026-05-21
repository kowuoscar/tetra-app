package com.tetramobile.tetra.whatsapp;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppServiceImpl implements WhatsAppService {

    private final WhatsAppProperties props;
    private final RestClient restClient;

    @Override
    public void sendText(String groupId, String message) {
        if (!props.isConfigured()) {
            log.info("WhatsApp not configured, skipping dispatch to group={}", groupId);
            return;
        }
        log.info("WhatsApp dispatch: group={} message={}", groupId,
            message.length() > 80 ? message.substring(0, 80) + "…" : message);
        try {
            restClient.post()
                .uri("https://graph.facebook.com/v19.0/{phoneNumberId}/messages",
                    props.phoneNumberId())
                .header("Authorization", "Bearer " + props.apiToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                    "messaging_product", "whatsapp",
                    "to", groupId,
                    "type", "text",
                    "text", Map.of("body", message)
                ))
                .retrieve()
                .toBodilessEntity();
        } catch (Exception e) {
            log.warn("WhatsApp dispatch failed: group={} error={}", groupId, e.getMessage());
        }
    }
}
