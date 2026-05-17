package com.tetramobile.tetra.customer.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CustomerSummaryResponse(
        UUID id,
        String name,
        String contactInfo,
        int phoneCount,
        int simCardCount,
        int openRequestCount,
        BigDecimal currentMonthCost,
        Instant createdAt
) {}
