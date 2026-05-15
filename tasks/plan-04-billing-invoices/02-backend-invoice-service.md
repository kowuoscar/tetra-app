# Backend — InvoiceService: Current, Patch, Send, Mark-Paid, PDF Stream, List

## Domain

backend

## Plan

`plans/plan-04-billing-invoices.md`

## Depends on

- `tasks/plan-04-billing-invoices/00-backend-invoice-entity.md` — Invoice entity, InvoiceRepository
- `tasks/plan-04-billing-invoices/01-backend-invoice-pdf.md` — InvoicePdfService, InvoiceRenderData
- `tasks/plan-03-requests/01-backend-storage-service.md` — StorageService (upload + download)
- `tasks/plan-05-dashboard-costs/00-backend-system-settings.md` — SystemSettingsService.load()
- `tasks/plan-03-requests/00-backend-request-entity.md` — RequestRepository.findDoneByPeriod, RequestPartRepository

## References

- `specs/backend.md#invoice-rules`
- `docs/contracts.md#get-invoicescurrent` through `GET /invoices/{id}/pdf`

## Context

Company-wide monthly invoice issued to Tetra Mobile Solutions FZ-LLC. NOT per-customer. No `InvoiceLineItem` entity — amounts are aggregate fields on Invoice directly.

**Status flow:** `draft → sent → paid` (paid is terminal)

**Admin/company only** — customer role gets 403 on all invoice endpoints.

**Key operations:**
- `GET /invoices/current` — auto-create draft for current month if missing; carry prior month values
- `PATCH /invoices/{id}` — field-scoped: admin sets `support_fees`; admin+company set `rolling_advance_current`; draft only
- `POST /invoices/{id}/send` — freeze `support_expenses`, generate PDF, store MinIO, draft→sent
- `POST /invoices/{id}/mark-paid` — sent→paid
- `GET /invoices/{id}/pdf` — stream binary from MinIO (not presigned redirect)
- `GET /invoices` — paginated list, admin+company only

---

### Inlined spec excerpts

**InvoiceSummary:** `id, invoice_number, period_month, period_year, status, total, created_at, sent_at, paid_at`

**InvoiceDetail (adds):** `support_fees, support_expenses, rolling_advance_current, rolling_advance_previous, previous_balance, taxes, pdf_available`

**computeTotal:** `support_fees + support_expenses + rolling_advance_current - rolling_advance_previous + previous_balance + taxes`

**Auto-carry logic (on draft creation):**
```
previous_month_invoice = findTopByOrderByPeriodYearDescPeriodMonthDesc()
rolling_advance_previous = previous_month.rolling_advance_current (or 0)
previous_balance = previous_month.total if previous_month.status != paid else 0
```

**support_expenses freeze on send:**
```
= sum of all SimCard.base_monthly_fee for non-cancelled SIMs
+ sum of SUM(RequestPart.cost) for all done requests in this period
```

---

## Implementation

### 1. DTOs

`com.tetramobile.tetra.invoice.dto`:

```java
public record PatchInvoiceRequest(
    BigDecimal supportFees,          // admin only; null = no change
    BigDecimal rollingAdvanceCurrent // admin+company; null = no change
) {}

public record InvoiceSummaryResponse(
    UUID id, Long invoiceNumber, int periodMonth, int periodYear,
    InvoiceStatus status, BigDecimal total,
    Instant createdAt, Instant sentAt, Instant paidAt
) {}

public record InvoiceDetailResponse(
    UUID id, Long invoiceNumber, int periodMonth, int periodYear,
    InvoiceStatus status,
    BigDecimal supportFees,
    BigDecimal supportExpenses,
    BigDecimal rollingAdvanceCurrent,
    BigDecimal rollingAdvancePrevious,
    BigDecimal previousBalance,
    BigDecimal taxes,
    BigDecimal total,
    boolean pdfAvailable,
    Instant createdAt, Instant sentAt, Instant paidAt
) {}
```

### 2. InvoiceService interface

```java
public interface InvoiceService {
    InvoiceDetailResponse getCurrentInvoice();
    PagedResponse<InvoiceSummaryResponse> listInvoices(InvoiceStatus status, Pageable pageable,
        AuthenticatedUser caller);
    InvoiceDetailResponse getInvoice(UUID id, AuthenticatedUser caller);
    InvoiceDetailResponse patchInvoice(UUID id, PatchInvoiceRequest body, AuthenticatedUser caller);
    InvoiceDetailResponse sendInvoice(UUID id);
    InvoiceDetailResponse markPaid(UUID id);
    void streamPdf(UUID id, AuthenticatedUser caller, HttpServletResponse response);
}
```

### 3. InvoiceServiceImpl

`com.tetramobile.tetra.invoice.InvoiceServiceImpl`:

```java
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceQueryRepository invoiceQueryRepository;
    private final SimCardRepository simCardRepository;
    private final RequestRepository requestRepository;
    private final RequestPartRepository requestPartRepository;
    private final InvoicePdfService pdfService;
    private final StorageService storageService;
    private final SystemSettingsService settingsService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public InvoiceDetailResponse getCurrentInvoice() {
        SecurityUtils.requireAdmin();
        int month = LocalDate.now().getMonthValue();
        int year = LocalDate.now().getYear();

        return invoiceRepository.findByPeriodMonthAndPeriodYear(month, year)
            .map(this::toDetail)
            .orElseGet(() -> toDetail(createDraft(month, year)));
    }

    private Invoice createDraft(int month, int year) {
        Invoice draft = new Invoice();
        draft.setInvoiceNumber(invoiceRepository.nextInvoiceNumber());
        draft.setPeriodMonth(month);
        draft.setPeriodYear(year);

        // auto-carry from previous invoice
        invoiceRepository.findTopByOrderByPeriodYearDescPeriodMonthDesc().ifPresent(prev -> {
            draft.setRollingAdvancePrevious(prev.getRollingAdvanceCurrent());
            if (prev.getStatus() != InvoiceStatus.paid) {
                draft.setPreviousBalance(prev.getTotal());
            }
        });

        draft.setTotal(draft.computeTotal());
        return invoiceRepository.save(draft);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<InvoiceSummaryResponse> listInvoices(
            InvoiceStatus status, Pageable pageable, AuthenticatedUser caller) {
        SecurityUtils.requireAdminOrCompany();
        return invoiceQueryRepository.listInvoices(status, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceDetailResponse getInvoice(UUID id, AuthenticatedUser caller) {
        SecurityUtils.requireAdminOrCompany();
        return toDetail(findById(id));
    }

    @Override
    public InvoiceDetailResponse patchInvoice(UUID id, PatchInvoiceRequest body,
                                               AuthenticatedUser caller) {
        SecurityUtils.requireAdminOrCompany();
        Invoice invoice = findById(id);

        if (invoice.getStatus() != InvoiceStatus.draft)
            throw new UnprocessableEntityException("not_draft", "Only draft invoices can be edited");

        if (body.supportFees() != null) {
            SecurityUtils.requireAdmin();
            invoice.setSupportFees(body.supportFees());
        }
        if (body.rollingAdvanceCurrent() != null) {
            invoice.setRollingAdvanceCurrent(body.rollingAdvanceCurrent());
        }

        invoice.setTotal(invoice.computeTotal());
        return toDetail(invoiceRepository.save(invoice));
    }

    @Override
    public InvoiceDetailResponse sendInvoice(UUID id) {
        SecurityUtils.requireAdmin();
        Invoice invoice = findById(id);

        if (invoice.getStatus() != InvoiceStatus.draft)
            throw new UnprocessableEntityException("not_draft", "Only draft invoices can be sent");

        // freeze support_expenses
        BigDecimal simTotal = simCardRepository.findAll().stream()
            .filter(s -> s.getStatus() != SimStatus.cancelled)
            .map(SimCard::getBaseMonthlyFee)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal requestTotal = requestRepository
            .findDoneByPeriod(invoice.getPeriodMonth(), invoice.getPeriodYear())
            .stream()
            .map(req -> requestPartRepository.findByRequestId(req.getId())
                .stream().map(RequestPart::getCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        invoice.setSupportExpenses(simTotal.add(requestTotal));
        invoice.setTotal(invoice.computeTotal());
        invoice.setStatus(InvoiceStatus.sent);
        invoice.setSentAt(Instant.now());
        invoiceRepository.save(invoice);

        // generate and store PDF
        try {
            SystemSettings settings = settingsService.load();
            InvoiceRenderData renderData = new InvoiceRenderData(
                invoice.getInvoiceNumber(),
                invoice.getPeriodMonth(), invoice.getPeriodYear(),
                invoice.getSupportFees(), invoice.getSupportExpenses(),
                invoice.getRollingAdvanceCurrent(), invoice.getRollingAdvancePrevious(),
                invoice.getPreviousBalance(), invoice.getTaxes(), invoice.getTotal(),
                LocalDate.now(),
                InvoiceRenderData.fromSettings(settings)
            );
            byte[] pdf = pdfService.generate(renderData);
            String key = "invoices/" + invoice.getInvoiceNumber() + ".pdf";
            storageService.upload(key, new ByteArrayInputStream(pdf), pdf.length, "application/pdf");
            invoice.setPdfStorageKey(key);
            invoiceRepository.save(invoice);
        } catch (Exception e) {
            log.warn("PDF generation/upload failed for invoice #{}: {}", invoice.getInvoiceNumber(), e.getMessage());
        }

        eventPublisher.publishEvent(new InvoiceSentEvent(
            invoice.getId(), invoice.getInvoiceNumber(), invoice.getTotal(),
            Month.of(invoice.getPeriodMonth()).getDisplayName(TextStyle.FULL, Locale.ENGLISH)
                + " " + invoice.getPeriodYear()
        ));

        return toDetail(invoice);
    }

    @Override
    public InvoiceDetailResponse markPaid(UUID id) {
        SecurityUtils.requireAdmin();
        Invoice invoice = findById(id);

        if (invoice.getStatus() != InvoiceStatus.sent)
            throw new UnprocessableEntityException("not_sent", "Only sent invoices can be marked paid");

        invoice.setStatus(InvoiceStatus.paid);
        invoice.setPaidAt(Instant.now());
        return toDetail(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional(readOnly = true)
    public void streamPdf(UUID id, AuthenticatedUser caller, HttpServletResponse response) {
        SecurityUtils.requireAdminOrCompany();
        Invoice invoice = findById(id);

        if (invoice.getPdfStorageKey() == null)
            throw new NotFoundException("pdf_not_available", "PDF has not been generated yet");

        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition",
            "attachment; filename=\"invoice-" + invoice.getInvoiceNumber() + ".pdf\"");

        try (InputStream stream = storageService.download(invoice.getPdfStorageKey())) {
            stream.transferTo(response.getOutputStream());
        } catch (IOException e) {
            log.error("PDF stream failed for invoice {}", id, e);
            throw new StorageException("Cannot stream invoice PDF", e);
        }
    }

    // --- helpers ---

    private Invoice findById(UUID id) {
        return invoiceRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("invoice_not_found", "Invoice not found"));
    }

    private InvoiceDetailResponse toDetail(Invoice inv) {
        return new InvoiceDetailResponse(
            inv.getId(), inv.getInvoiceNumber(),
            inv.getPeriodMonth(), inv.getPeriodYear(),
            inv.getStatus(),
            inv.getSupportFees(), inv.getSupportExpenses(),
            inv.getRollingAdvanceCurrent(), inv.getRollingAdvancePrevious(),
            inv.getPreviousBalance(), inv.getTaxes(), inv.getTotal(),
            inv.getPdfStorageKey() != null,
            inv.getCreatedAt(), inv.getSentAt(), inv.getPaidAt()
        );
    }
}
```

### 4. InvoiceSentEvent

```java
public record InvoiceSentEvent(
    UUID invoiceId,
    Long invoiceNumber,
    BigDecimal total,
    String period
) {}
```

WhatsApp listener (add to `WhatsAppEventListener` from plan-03 task 04):
```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void onInvoiceSent(InvoiceSentEvent event) {
    String msg = String.format("Invoice #%d for %s sent. Total: %.2f AED",
        event.invoiceNumber(), event.period(), event.total());
    // send to company-level group (from SystemSettings or config)
    whatsAppService.sendText(whatsAppProperties.getCompanyGroupId(), msg);
}
```

Add `company_group_id` to `WhatsAppProperties` (or config property `whatsapp.company-group-id`).

### 5. InvoiceQueryRepository (jOOQ)

`com.tetramobile.tetra.invoice.InvoiceQueryRepository`:

```java
@Repository @RequiredArgsConstructor
public class InvoiceQueryRepository {

    private final DSLContext dsl;

    public PagedResponse<InvoiceSummaryResponse> listInvoices(
            InvoiceStatus status, Pageable pageable) {

        var inv = INVOICES.as("inv");
        var query = dsl.select(
                inv.ID, inv.INVOICE_NUMBER,
                inv.PERIOD_MONTH, inv.PERIOD_YEAR,
                inv.STATUS, inv.TOTAL,
                inv.CREATED_AT, inv.SENT_AT, inv.PAID_AT
            )
            .from(inv);

        if (status != null) query = query.where(inv.STATUS.eq(status.name()));

        int total = dsl.fetchCount(query);
        var rows = query
            .orderBy(inv.CREATED_AT.desc())
            .limit(pageable.getPageSize()).offset(pageable.getOffset())
            .fetch(r -> new InvoiceSummaryResponse(
                r.get(inv.ID), r.get(inv.INVOICE_NUMBER),
                r.get(inv.PERIOD_MONTH), r.get(inv.PERIOD_YEAR),
                InvoiceStatus.valueOf(r.get(inv.STATUS)),
                r.get(inv.TOTAL),
                r.get(inv.CREATED_AT).toInstant(),
                r.get(inv.SENT_AT) != null ? r.get(inv.SENT_AT).toInstant() : null,
                r.get(inv.PAID_AT) != null ? r.get(inv.PAID_AT).toInstant() : null
            ));

        return PagedResponse.of(rows, total, pageable);
    }
}
```

### 6. InvoiceController

```java
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
            @RequestParam(defaultValue = "20") @Max(100) int size) {
        return ResponseEntity.ok(invoiceService.listInvoices(
            status, PageRequest.of(page, size), SecurityUtils.currentUser()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDetailResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.getInvoice(id, SecurityUtils.currentUser()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<InvoiceDetailResponse> patch(
            @PathVariable UUID id,
            @RequestBody PatchInvoiceRequest body) {
        return ResponseEntity.ok(invoiceService.patchInvoice(id, body, SecurityUtils.currentUser()));
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
        invoiceService.streamPdf(id, SecurityUtils.currentUser(), response);
    }
}
```

---

## Integration tests

`InvoiceServiceIT`:
- `GET /invoices/current` → creates draft for current month; second call returns same draft
- Draft carries `rolling_advance_previous` from prior month's `rolling_advance_current`
- Draft carries `previous_balance` from prior unpaid invoice
- Admin patches `support_fees=5000` → 200, total recomputed
- Company patches `rolling_advance_current=500` → 200, total recomputed
- Company tries to patch `support_fees` → 403
- `POST /invoices/{id}/send` → status=sent, sentAt set, supportExpenses frozen, pdf_available=true (with MinIO testcontainer)
- `POST /invoices/{id}/send` on sent invoice → 422
- `POST /invoices/{id}/mark-paid` → status=paid, paidAt set
- `GET /invoices/{id}/pdf` → 200 binary with Content-Type: application/pdf
- `GET /invoices/{id}/pdf` when pdf_storage_key null → 404
- Customer calls any endpoint → 403

---

## Acceptance criteria

- [ ] `GET /invoices/current` auto-creates draft with carried values; idempotent
- [ ] `PATCH /invoices/{id}` field-scoped; company cannot set `support_fees`; draft-only
- [ ] `POST /invoices/{id}/send` freezes `support_expenses`, generates PDF, draft→sent
- [ ] `POST /invoices/{id}/mark-paid` sent→paid
- [ ] `GET /invoices/{id}/pdf` streams binary PDF with Content-Disposition: attachment
- [ ] Customer role → 403 on all endpoints
- [ ] `./mvnw test -Dtest=InvoiceServiceIT` passes

## Automated checks

```bash
cd api
./mvnw test -Dtest=InvoiceServiceIT
./mvnw verify
```
