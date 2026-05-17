package com.tetramobile.tetra.customer.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CostBreakdownResponse(
        int periodMonth,
        int periodYear,
        List<SimFeeItem> simFees,
        List<RequestFeeItem> requestFees,
        BigDecimal total
) {

    public record SimFeeItem(
            UUID simCardId,
            String simCardType,
            BigDecimal amount,
            boolean isActual
    ) {}

    public record RequestFeeItem(
            UUID requestId,
            String requestType,
            BigDecimal amount
    ) {}
}
