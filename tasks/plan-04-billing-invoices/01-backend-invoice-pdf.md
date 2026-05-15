# Backend — Invoice PDF Generation (Thymeleaf + OpenPDF)

## Domain

backend

## Plan

`plans/plan-04-billing-invoices.md`

## Depends on

- `tasks/plan-04-billing-invoices/00-backend-invoice-entity.md` — Invoice entity with all amount fields
- `tasks/plan-05-dashboard-costs/00-backend-system-settings.md` — SystemSettings (bank details)

## References

- `specs/backend.md#invoice-pdf-rules` — in-JVM generation, Thymeleaf→HTML→PDF flow
- `docs/architecture.md` — OpenPDF 2.0.3, Thymeleaf on classpath

## Context

`InvoicePdfService` accepts `InvoiceRenderData` (all fields needed for the template), renders Thymeleaf template to HTML, converts to PDF bytes via OpenPDF. The service is pure: no DB access, no MinIO. Called by `InvoiceServiceImpl` during the send flow.

**Company-wide invoice (corrected):** Invoice is issued to Tetra Mobile Solutions FZ-LLC, not per-customer. No `customerName` or `lineItems`. Template shows named amount rows: Support Fees, Support Expenses, Rolling Advance (current + previous), Previous Balance, Taxes, Total. Bank details from SystemSettings appear as a payment section.

---

### Inlined spec excerpts

**Template data fields (company-wide):**
```
invoiceNumber:          Long
periodMonth:            int
periodYear:             int
supportFees:            BigDecimal    ← set by admin
supportExpenses:        BigDecimal    ← frozen at send
rollingAdvanceCurrent:  BigDecimal    ← added to total
rollingAdvancePrevious: BigDecimal    ← subtracted from total
previousBalance:        BigDecimal    ← added to total
taxes:                  BigDecimal    ← always 0
total:                  BigDecimal    ← pre-computed
createdDate:            LocalDate
bankDetails:            BankDetails   ← from SystemSettings
```

**PDF layout:**
- Header: company name + "Invoice" title
- Invoice number, period, date
- Amounts table (named rows, no line items)
- Payment details section: Account Holder, IBAN, SWIFT, Address

---

## Implementation

### 1. InvoiceRenderData DTO

`com.tetramobile.tetra.invoice.InvoiceRenderData`:
```java
public record InvoiceRenderData(
    Long invoiceNumber,
    int periodMonth,
    int periodYear,
    BigDecimal supportFees,
    BigDecimal supportExpenses,
    BigDecimal rollingAdvanceCurrent,
    BigDecimal rollingAdvancePrevious,
    BigDecimal previousBalance,
    BigDecimal taxes,
    BigDecimal total,
    LocalDate createdDate,
    BankDetails bankDetails
) {
    public record BankDetails(
        String bankAccountHolder,
        String bankIban,
        String bankSwift,
        String companyName,
        String companyAddress
    ) {}

    public String periodLabel() {
        return Month.of(periodMonth).getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + periodYear;
    }

    public static BankDetails fromSettings(SystemSettings s) {
        return new BankDetails(
            s.getBankAccountHolder(), s.getBankIban(), s.getBankSwift(),
            s.getCompanyName(), s.getCompanyAddress()
        );
    }
}
```

### 2. InvoicePdfService interface

`com.tetramobile.tetra.invoice.InvoicePdfService`:
```java
public interface InvoicePdfService {
    byte[] generate(InvoiceRenderData data);
}
```

### 3. ThymeleafOpenPdfInvoicePdfServiceImpl

`com.tetramobile.tetra.invoice.ThymeleafOpenPdfInvoicePdfServiceImpl`:
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class ThymeleafOpenPdfInvoicePdfServiceImpl implements InvoicePdfService {

    private final TemplateEngine templateEngine;

    @Override
    public byte[] generate(InvoiceRenderData data) {
        Context ctx = new Context(Locale.ENGLISH);
        ctx.setVariable("inv", data);
        String html = templateEngine.process("invoice", ctx);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ITextRenderer renderer = new ITextRenderer();
            renderer.setDocumentFromString(html);
            renderer.layout();
            renderer.createPDF(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("PDF generation failed for invoice #{}", data.invoiceNumber(), e);
            throw new InvoicePdfException("PDF generation failed", e);
        }
    }
}
```

`InvoicePdfException`:
```java
public class InvoicePdfException extends RuntimeException {
    public InvoicePdfException(String message, Throwable cause) { super(message, cause); }
}
```

Handle in `GlobalExceptionHandler`:
```java
@ExceptionHandler(InvoicePdfException.class)
public ResponseEntity<ErrorResponse> handlePdf(InvoicePdfException ex) {
    log.error("PDF error", ex);
    return ResponseEntity.status(500)
        .body(new ErrorResponse("pdf_generation_failed", "Could not generate invoice PDF"));
}
```

### 4. Thymeleaf template

`src/main/resources/templates/invoice.html`:
```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #111; margin: 40px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .subtitle { font-size: 14px; font-weight: bold; color: #444; margin-bottom: 2px; }
    .meta { color: #555; font-size: 11px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
    .amount { text-align: right; }
    .deduct { text-align: right; color: #c00; }
    .total-row td { font-weight: bold; border-top: 2px solid #111; border-bottom: none; }
    .bank { margin-top: 32px; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; }
    .bank p { margin: 3px 0; font-size: 11px; }
    .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <h1 th:text="${inv.bankDetails.companyName}">Company Name</h1>
  <div class="subtitle">Invoice</div>
  <div class="meta">
    #<span th:text="${inv.invoiceNumber}"></span> &nbsp;·&nbsp;
    <span th:text="${inv.periodLabel()}"></span> &nbsp;·&nbsp;
    Date: <span th:text="${inv.createdDate}"></span>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="amount">Amount (AED)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Support Fees</td>
        <td class="amount" th:text="${#numbers.formatDecimal(inv.supportFees, 1, 2)}"></td>
      </tr>
      <tr>
        <td>Support Expenses</td>
        <td class="amount" th:text="${#numbers.formatDecimal(inv.supportExpenses, 1, 2)}"></td>
      </tr>
      <tr th:if="${inv.rollingAdvanceCurrent.compareTo(T(java.math.BigDecimal).ZERO) != 0}">
        <td>Rolling Advance (Current)</td>
        <td class="amount" th:text="${#numbers.formatDecimal(inv.rollingAdvanceCurrent, 1, 2)}"></td>
      </tr>
      <tr th:if="${inv.rollingAdvancePrevious.compareTo(T(java.math.BigDecimal).ZERO) != 0}">
        <td>Rolling Advance (Previous) — deduction</td>
        <td class="deduct" th:text="${'(' + #numbers.formatDecimal(inv.rollingAdvancePrevious, 1, 2) + ')'}"></td>
      </tr>
      <tr th:if="${inv.previousBalance.compareTo(T(java.math.BigDecimal).ZERO) != 0}">
        <td>Previous Balance (Unpaid)</td>
        <td class="amount" th:text="${#numbers.formatDecimal(inv.previousBalance, 1, 2)}"></td>
      </tr>
      <tr>
        <td>Taxes</td>
        <td class="amount" th:text="${#numbers.formatDecimal(inv.taxes, 1, 2)}"></td>
      </tr>
      <tr class="total-row">
        <td>Total</td>
        <td class="amount" th:text="${#numbers.formatDecimal(inv.total, 1, 2)}"></td>
      </tr>
    </tbody>
  </table>

  <div class="bank">
    <p><strong>Payment Details</strong></p>
    <p>Account Holder: <span th:text="${inv.bankDetails.bankAccountHolder}"></span></p>
    <p>IBAN: <span th:text="${inv.bankDetails.bankIban}"></span></p>
    <p>SWIFT: <span th:text="${inv.bankDetails.bankSwift}"></span></p>
    <p>Address: <span th:text="${inv.bankDetails.companyAddress}"></span></p>
  </div>

  <div class="footer" th:text="${inv.bankDetails.companyName + ' · ' + inv.bankDetails.companyAddress}"></div>
</body>
</html>
```

### 5. Spring Boot autoconfiguration

Spring Boot auto-configures `TemplateEngine` when `spring-boot-starter-thymeleaf` is on classpath. No additional bean required.

---

## Unit test

`InvoicePdfServiceTest`:
```java
@SpringBootTest(classes = {ThymeleafOpenPdfInvoicePdfServiceImpl.class})
class InvoicePdfServiceTest {

    @Autowired InvoicePdfService pdfService;

    @Test
    void generateReturnsPdfBytes() {
        InvoiceRenderData.BankDetails bank = new InvoiceRenderData.BankDetails(
            "Oscar Doe", "AE070331234567890123456", "WIOBAEADXXX",
            "Tetra Mobile Solutions FZ-LLC", "Dubai, UAE"
        );
        InvoiceRenderData data = new InvoiceRenderData(
            1001L, 5, 2026,
            new BigDecimal("5000.00"),  // supportFees
            new BigDecimal("1200.00"),  // supportExpenses
            new BigDecimal("500.00"),   // rollingAdvanceCurrent
            new BigDecimal("300.00"),   // rollingAdvancePrevious
            BigDecimal.ZERO,            // previousBalance
            BigDecimal.ZERO,            // taxes
            new BigDecimal("6400.00"),  // total
            LocalDate.now(), bank
        );
        byte[] pdf = pdfService.generate(data);
        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }
}
```

---

## Acceptance criteria

- [ ] `InvoicePdfService.generate(data)` returns non-empty byte array starting with `%PDF`
- [ ] Template renders invoice number, period, all named amount rows, bank details
- [ ] No `customerName` or per-line-item table — company-wide amounts only
- [ ] `InvoicePdfException` → HTTP 500 via `GlobalExceptionHandler`
- [ ] `./mvnw test -Dtest=InvoicePdfServiceTest` passes

## Automated checks

```bash
cd api
./mvnw test -Dtest=InvoicePdfServiceTest
./mvnw compile
```
