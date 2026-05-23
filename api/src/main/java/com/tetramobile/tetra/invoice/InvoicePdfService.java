package com.tetramobile.tetra.invoice;

public interface InvoicePdfService {
    byte[] generate(InvoiceRenderData data);
}
