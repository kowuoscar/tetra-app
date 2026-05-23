package com.tetramobile.tetra.invoice;

import com.tetramobile.tetra.invoice.dto.InvoiceDetailResponse;
import com.tetramobile.tetra.invoice.dto.InvoiceSummaryResponse;
import com.tetramobile.tetra.invoice.dto.PatchInvoiceRequest;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping("/current")
    public ResponseEntity<InvoiceDetailResponse> current() {
        return ResponseEntity.ok(invoiceService.getCurrentInvoice());
    }

    @GetMapping
    public ResponseEntity<PagedResponse<InvoiceSummaryResponse>> list(
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(invoiceService.listInvoices(status, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDetailResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.getInvoice(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<InvoiceDetailResponse> patch(
            @PathVariable UUID id,
            @RequestBody PatchInvoiceRequest body) {
        return ResponseEntity.ok(invoiceService.patchInvoice(id, body));
    }

    @PostMapping("/{id}/send")
    public ResponseEntity<InvoiceDetailResponse> send(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.sendInvoice(id));
    }

    @PostMapping("/{id}/mark-paid")
    public ResponseEntity<InvoiceDetailResponse> markPaid(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.markPaid(id));
    }

    @GetMapping("/{id}/pdf")
    public void pdf(@PathVariable UUID id, HttpServletResponse response) {
        invoiceService.streamPdf(id, response);
    }
}
