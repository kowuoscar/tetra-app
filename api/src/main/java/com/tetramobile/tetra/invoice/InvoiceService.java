package com.tetramobile.tetra.invoice;

import com.tetramobile.tetra.invoice.dto.InvoiceDetailResponse;
import com.tetramobile.tetra.invoice.dto.InvoiceSummaryResponse;
import com.tetramobile.tetra.invoice.dto.PatchInvoiceRequest;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface InvoiceService {
    InvoiceDetailResponse getCurrentInvoice();
    InvoiceDetailResponse getInvoice(UUID id);
    PagedResponse<InvoiceSummaryResponse> listInvoices(InvoiceStatus status, Pageable pageable);
    InvoiceDetailResponse patchInvoice(UUID id, PatchInvoiceRequest request);
    InvoiceDetailResponse sendInvoice(UUID id);
    InvoiceDetailResponse markPaid(UUID id);
    void streamPdf(UUID id, HttpServletResponse response);
}
