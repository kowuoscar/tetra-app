package com.tetramobile.tetra.invoice.dto;

import com.tetramobile.tetra.invoice.InvoiceStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InvoiceDetailResponse(
        UUID id,
        Integer invoiceNumber,
        int periodMonth,
        int periodYear,
        BigDecimal supportFees,
        BigDecimal supportExpenses,
        BigDecimal rollingAdvanceCurrent,
        BigDecimal rollingAdvancePrevious,
        BigDecimal previousBalance,
        BigDecimal taxes,
        BigDecimal total,
        InvoiceStatus status,
        String pdfStorageKey,
        Instant createdAt,
        Instant sentAt,
        Instant paidAt
) {
}
