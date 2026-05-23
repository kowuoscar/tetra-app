package com.tetramobile.tetra.invoice;

import java.util.UUID;

public record InvoiceSentEvent(
        UUID invoiceId,
        Integer invoiceNumber,
        int periodMonth,
        int periodYear
) {
}
