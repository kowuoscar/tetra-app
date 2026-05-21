package com.tetramobile.tetra.simcard.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record MonthlyBillingResponse(
        UUID simCardId,
        int periodMonth,
        int periodYear,
        BigDecimal actualAmount
) {}
