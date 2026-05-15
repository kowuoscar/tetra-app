# Backend — Invoice Entity (Company-Wide Monthly Invoice)

## Domain

backend

## Plan

`plans/plan-04-billing-invoices.md`

## Depends on

- `tasks/plan-00-bootstrap/00-backend-scaffold.md` — Flyway V1 schema has `invoices` table + `invoice_number_seq`

## References

- `docs/contracts.md` — InvoiceSummary, InvoiceDetail types
- `specs/backend.md#invoice-rules`
- `docs/architecture.md` — invoice_number_seq

## Context

Single company-wide invoice per calendar month. NOT per-customer. Admin generates the monthly invoice that gets sent to Tetra Mobile Solutions FZ-LLC. Contains aggregated numbers: support_fees (base salary set by admin), support_expenses (sum of all customers' fees — frozen at send time), rolling advance fields, previous balance, taxes (always 0).

No `InvoiceLineItem` entity — the invoice stores aggregated amounts, not per-line-item breakdown. Per-customer breakdown is in the cost-breakdown endpoint (plan-02).

---

### Inlined spec excerpts

**InvoiceSummary (contracts.md):**
```
id, invoice_number, period_month, period_year, total, status, created_at
```

**InvoiceDetail adds:**
```
support_fees            ← base salary; admin sets via PATCH
support_expenses        ← sum of all customer fees; frozen at send
rolling_advance_current ← admin or company sets via PATCH
rolling_advance_previous← auto-carried from previous month's rolling_advance_current
previous_balance        ← previous invoice total if unpaid, else 0
taxes                   ← always 0 (MVP)
```

**Status flow:** `draft → sent → paid` (paid is terminal)

**invoice_number_seq** — PostgreSQL sequence; draw at creation of draft.

---

## Implementation

### 1. InvoiceStatus enum

```java
public enum InvoiceStatus {
    draft, sent, paid
}
```

### 2. Invoice entity

`com.tetramobile.tetra.invoice.Invoice`:
```java
@Entity
@Table(name = "invoices",
    uniqueConstraints = @UniqueConstraint(columnNames = {"period_month", "period_year"}))
@Getter @Setter
@EntityListeners(AuditingEntityListener.class)
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "invoice_number", nullable = false, unique = true)
    private Long invoiceNumber;

    @Column(name = "period_month", nullable = false)
    private int periodMonth;

    @Column(name = "period_year", nullable = false)
    private int periodYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private InvoiceStatus status = InvoiceStatus.draft;

    @Column(name = "support_fees", nullable = false, precision = 10, scale = 2)
    private BigDecimal supportFees = BigDecimal.ZERO;

    @Column(name = "support_expenses", nullable = false, precision = 10, scale = 2)
    private BigDecimal supportExpenses = BigDecimal.ZERO;

    @Column(name = "rolling_advance_current", nullable = false, precision = 10, scale = 2)
    private BigDecimal rollingAdvanceCurrent = BigDecimal.ZERO;

    @Column(name = "rolling_advance_previous", nullable = false, precision = 10, scale = 2)
    private BigDecimal rollingAdvancePrevious = BigDecimal.ZERO;

    @Column(name = "previous_balance", nullable = false, precision = 10, scale = 2)
    private BigDecimal previousBalance = BigDecimal.ZERO;

    @Column(name = "taxes", nullable = false, precision = 10, scale = 2)
    private BigDecimal taxes = BigDecimal.ZERO;

    @Column(name = "total", nullable = false, precision = 10, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "pdf_storage_key", length = 500)
    private String pdfStorageKey;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    public BigDecimal computeTotal() {
        return supportFees
            .add(supportExpenses)
            .add(rollingAdvanceCurrent)
            .subtract(rollingAdvancePrevious)
            .add(previousBalance)
            .add(taxes);
    }
}
```

### 3. InvoiceRepository

```java
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByPeriodMonthAndPeriodYear(int month, int year);

    boolean existsByPeriodMonthAndPeriodYear(int month, int year);

    Optional<Invoice> findTopByOrderByPeriodYearDescPeriodMonthDesc();

    @Query(value = "SELECT nextval('invoice_number_seq')", nativeQuery = true)
    Long nextInvoiceNumber();
}
```

### 4. Flyway migration check

V1 must have:
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number BIGINT NOT NULL UNIQUE,
    period_month INT NOT NULL,
    period_year INT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'draft',
    support_fees NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    support_expenses NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    rolling_advance_current NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    rolling_advance_previous NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    previous_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    taxes NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    pdf_storage_key VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    UNIQUE (period_month, period_year)
);

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1001;
```

If V1 schema differs (e.g., had `customer_id`, had `invoice_line_items`), add correcting Flyway migration as next version number.

---

## Integration tests

`InvoiceEntityIT` (`@DataJpaTest`):
- Persist Invoice → verify invoiceNumber, status=draft, all money fields default to 0
- `nextInvoiceNumber()` called twice → second value > first
- `existsByPeriodMonthAndPeriodYear` → true after insert
- `findTopByOrderByPeriodYearDescPeriodMonthDesc` → returns most recent

---

## Acceptance criteria

- [ ] Invoice entity persists with all fields; no `customer_id` or `invoice_line_items`
- [ ] `computeTotal()` = support_fees + support_expenses + rolling_advance_current - rolling_advance_previous + previous_balance + taxes
- [ ] `nextInvoiceNumber()` returns sequential values
- [ ] Unique constraint on (period_month, period_year) enforced
- [ ] `./mvnw test -Dtest=InvoiceEntityIT` passes

## Automated checks

```bash
cd api
./mvnw test -Dtest=InvoiceEntityIT
./mvnw compile
```
