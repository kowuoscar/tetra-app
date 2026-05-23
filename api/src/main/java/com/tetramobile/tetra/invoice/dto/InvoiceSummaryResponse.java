package com.tetramobile.tetra.invoice.dto;

import com.tetramobile.tetra.invoice.InvoiceStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InvoiceSummaryResponse(
        UUID id,
        Integer invoiceNumber,
        int periodMonth,
        int periodYear,
        BigDecimal total,
        InvoiceStatus status,
        Instant createdAt,
        Instant sentAt,
        Instant paidAt
) {
}
