package com.tetramobile.tetra.invoice;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "invoice_number", nullable = false, updatable = false,
            insertable = false)
    private Integer invoiceNumber;

    @Column(name = "period_month", nullable = false)
    private Integer periodMonth;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

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

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private InvoiceStatus status = InvoiceStatus.draft;

    @Column(name = "pdf_storage_key")
    private String pdfStorageKey;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    /**
     * Recomputes and stores the total.
     * total = support_fees + support_expenses + rolling_advance_current
     *       - rolling_advance_previous + previous_balance + taxes
     */
    public BigDecimal computeTotal() {
        this.total = supportFees
                .add(supportExpenses)
                .add(rollingAdvanceCurrent)
                .subtract(rollingAdvancePrevious)
                .add(previousBalance)
                .add(taxes);
        return this.total;
    }
}
