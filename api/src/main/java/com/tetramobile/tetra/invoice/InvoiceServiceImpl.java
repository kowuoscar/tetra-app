package com.tetramobile.tetra.invoice;

import com.tetramobile.tetra.invoice.dto.InvoiceDetailResponse;
import com.tetramobile.tetra.invoice.dto.InvoiceSummaryResponse;
import com.tetramobile.tetra.invoice.dto.PatchInvoiceRequest;
import com.tetramobile.tetra.request.RequestPartRepository;
import com.tetramobile.tetra.request.RequestRepository;
import com.tetramobile.tetra.settings.SystemSettingsService;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import java.time.LocalDate;
import com.tetramobile.tetra.shared.exception.NotFoundException;
import com.tetramobile.tetra.shared.exception.UnprocessableEntityException;
import com.tetramobile.tetra.simcard.SimCardRepository;
import com.tetramobile.tetra.simcard.SimMonthlyBillingRepository;
import com.tetramobile.tetra.simcard.model.SimStatus;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import com.tetramobile.tetra.storage.StorageService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceServiceImpl implements InvoiceService {

    private static final String PDF_CONTENT_TYPE = "application/pdf";
    private static final String PDF_KEY_PREFIX = "invoices/";

    private final InvoiceRepository invoiceRepository;
    private final InvoiceQueryRepository invoiceQueryRepository;
    private final SimCardRepository simCardRepository;
    private final SimMonthlyBillingRepository simMonthlyBillingRepository;
    private final RequestRepository requestRepository;
    private final RequestPartRepository requestPartRepository;
    private final InvoicePdfService pdfService;
    private final StorageService storageService;
    private final SystemSettingsService settingsService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public InvoiceDetailResponse getCurrentInvoice() {
        SecurityUtils.requireAdmin();
        int month = LocalDate.now().getMonthValue();
        int year = LocalDate.now().getYear();
        return invoiceRepository.findByPeriodMonthAndPeriodYear(month, year)
                .map(this::toDetail)
                .orElseGet(() -> toDetail(buildAndSaveDraft(month, year)));
    }

    private Invoice buildAndSaveDraft(int month, int year) {
        Invoice draft = new Invoice();
        draft.setPeriodMonth(month);
        draft.setPeriodYear(year);
        invoiceRepository.findTopByOrderByPeriodYearDescPeriodMonthDesc()
                .ifPresent(prev -> {
                    draft.setRollingAdvancePrevious(prev.getRollingAdvanceCurrent());
                    if (prev.getStatus() != InvoiceStatus.paid) {
                        draft.setPreviousBalance(prev.getTotal());
                    }
                });
        draft.computeTotal();
        return invoiceRepository.save(draft);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceDetailResponse getInvoice(UUID id) {
        return toDetail(findById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<InvoiceSummaryResponse> listInvoices(InvoiceStatus status, Pageable pageable) {
        return invoiceQueryRepository.listInvoices(status, pageable);
    }

    @Override
    @Transactional
    public InvoiceDetailResponse patchInvoice(UUID id, PatchInvoiceRequest request) {
        SecurityUtils.requireAdminOrCompany();
        Invoice invoice = findById(id);
        if (invoice.getStatus() != InvoiceStatus.draft) {
            throw new UnprocessableEntityException("not_draft", "Only draft invoices can be edited");
        }
        if (request.supportFees() != null) {
            SecurityUtils.requireAdmin();
            invoice.setSupportFees(request.supportFees());
        }
        if (request.rollingAdvanceCurrent() != null) {
            invoice.setRollingAdvanceCurrent(request.rollingAdvanceCurrent());
        }
        invoice.computeTotal();
        return toDetail(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional
    public InvoiceDetailResponse sendInvoice(UUID id) {
        Invoice invoice = findById(id);
        if (invoice.getStatus() != InvoiceStatus.draft) {
            throw new UnprocessableEntityException("invalid_status_transition",
                    "Only draft invoices can be sent");
        }

        // Freeze support_expenses at send time
        BigDecimal simExpenses = computeSimExpenses(invoice.getPeriodMonth(), invoice.getPeriodYear());
        BigDecimal requestPartExpenses = computeRequestPartExpenses(invoice.getPeriodMonth(), invoice.getPeriodYear());
        invoice.setSupportExpenses(simExpenses.add(requestPartExpenses));
        invoice.computeTotal();
        invoice.setStatus(InvoiceStatus.sent);
        invoice.setSentAt(Instant.now());

        // Generate and store PDF — failure logs WARN but does NOT prevent status change
        String pdfKey = PDF_KEY_PREFIX + "invoice-" + id + ".pdf";
        try {
            InvoiceRenderData renderData = InvoiceRenderData.from(invoice, settingsService.load());
            byte[] pdfBytes = pdfService.generate(renderData);
            storageService.upload(pdfKey, new ByteArrayInputStream(pdfBytes), pdfBytes.length, PDF_CONTENT_TYPE);
            invoice.setPdfStorageKey(pdfKey);
        } catch (Exception e) {
            log.warn("Failed to generate/store PDF for invoice {}: {}", id, e.getMessage(), e);
        }

        Invoice saved = invoiceRepository.save(invoice);

        eventPublisher.publishEvent(new InvoiceSentEvent(
                saved.getId(),
                saved.getInvoiceNumber(),
                saved.getPeriodMonth(),
                saved.getPeriodYear()
        ));

        return toDetail(saved);
    }

    @Override
    @Transactional
    public InvoiceDetailResponse markPaid(UUID id) {
        Invoice invoice = findById(id);
        if (invoice.getStatus() != InvoiceStatus.sent) {
            throw new UnprocessableEntityException("invalid_status_transition",
                    "Only sent invoices can be marked as paid");
        }
        invoice.setStatus(InvoiceStatus.paid);
        invoice.setPaidAt(Instant.now());
        return toDetail(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional(readOnly = true)
    public void streamPdf(UUID id, HttpServletResponse response) {
        Invoice invoice = findById(id);
        if (invoice.getPdfStorageKey() == null) {
            throw new NotFoundException("Invoice PDF not available for invoice " + id);
        }
        response.setContentType(PDF_CONTENT_TYPE);
        response.setHeader("Content-Disposition",
                "inline; filename=\"invoice-" + invoice.getInvoiceNumber() + ".pdf\"");
        try (InputStream in = storageService.download(invoice.getPdfStorageKey())) {
            in.transferTo(response.getOutputStream());
        } catch (IOException e) {
            throw new RuntimeException("Failed to stream invoice PDF", e);
        }
    }

    // --- Private helpers ---

    private Invoice findById(UUID id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Invoice not found: " + id));
    }

    private BigDecimal computeSimExpenses(int month, int year) {
        List<com.tetramobile.tetra.simcard.model.SimCard> activeSims = simCardRepository.findAll()
                .stream()
                .filter(s -> s.getStatus() != SimStatus.cancelled)
                .toList();

        BigDecimal total = BigDecimal.ZERO;
        for (var sim : activeSims) {
            BigDecimal fee = simMonthlyBillingRepository
                    .findBySimCardIdAndPeriodMonthAndPeriodYear(sim.getId(), month, year)
                    .map(com.tetramobile.tetra.simcard.model.SimMonthlyBilling::getActualAmount)
                    .orElse(sim.getBaseMonthlyFee());
            total = total.add(fee);
        }
        return total;
    }

    private BigDecimal computeRequestPartExpenses(int month, int year) {
        return requestRepository.findDoneByPeriod(month, year)
                .stream()
                .flatMap(r -> requestPartRepository.findByRequestId(r.getId()).stream())
                .map(part -> part.getCost())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private InvoiceDetailResponse toDetail(Invoice invoice) {
        return new InvoiceDetailResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getPeriodMonth(),
                invoice.getPeriodYear(),
                invoice.getSupportFees(),
                invoice.getSupportExpenses(),
                invoice.getRollingAdvanceCurrent(),
                invoice.getRollingAdvancePrevious(),
                invoice.getPreviousBalance(),
                invoice.getTaxes(),
                invoice.getTotal(),
                invoice.getStatus(),
                invoice.getPdfStorageKey(),
                invoice.getCreatedAt(),
                invoice.getSentAt(),
                invoice.getPaidAt()
        );
    }
}
