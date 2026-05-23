package com.tetramobile.tetra.invoice.dto;

import java.math.BigDecimal;

public record PatchInvoiceRequest(
        BigDecimal supportFees,
        BigDecimal rollingAdvanceCurrent
) {
}
