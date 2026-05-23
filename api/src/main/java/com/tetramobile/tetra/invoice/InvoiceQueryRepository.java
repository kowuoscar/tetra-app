package com.tetramobile.tetra.invoice;

import com.tetramobile.tetra.invoice.dto.InvoiceSummaryResponse;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import lombok.RequiredArgsConstructor;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static com.tetramobile.tetra.shared.jooq.Tables.INVOICES;

@Repository
@RequiredArgsConstructor
public class InvoiceQueryRepository {

    private final DSLContext dsl;

    // New columns added by V6 migration — not in current jOOQ codegen yet.
    // Unqualified names so they resolve correctly regardless of table alias.
    private static final Field<LocalDateTime> SENT_AT =
            DSL.field(DSL.name("SENT_AT"), SQLDataType.LOCALDATETIME);
    private static final Field<LocalDateTime> PAID_AT =
            DSL.field(DSL.name("PAID_AT"), SQLDataType.LOCALDATETIME);

    public PagedResponse<InvoiceSummaryResponse> listInvoices(InvoiceStatus status, Pageable pageable) {
        var inv = INVOICES.as("inv");

        Condition condition = DSL.trueCondition();
        if (status != null) {
            condition = condition.and(inv.STATUS.eq(status.name()));
        }

        var query = dsl.select(
                        inv.ID,
                        inv.INVOICE_NUMBER,
                        inv.PERIOD_MONTH,
                        inv.PERIOD_YEAR,
                        inv.TOTAL,
                        inv.STATUS,
                        inv.CREATED_AT,
                        SENT_AT,
                        PAID_AT
                )
                .from(inv)
                .where(condition);

        int total = dsl.fetchCount(query);

        var rows = query
                .orderBy(inv.PERIOD_YEAR.desc(), inv.PERIOD_MONTH.desc())
                .limit(pageable.getPageSize())
                .offset(pageable.getOffset())
                .fetch(rec -> new InvoiceSummaryResponse(
                        rec.get(inv.ID),
                        rec.get(inv.INVOICE_NUMBER),
                        rec.get(inv.PERIOD_MONTH),
                        rec.get(inv.PERIOD_YEAR),
                        rec.get(inv.TOTAL),
                        InvoiceStatus.valueOf(rec.get(inv.STATUS)),
                        rec.get(inv.CREATED_AT).toInstant(ZoneOffset.UTC),
                        rec.get(SENT_AT) != null ? rec.get(SENT_AT).toInstant(ZoneOffset.UTC) : null,
                        rec.get(PAID_AT) != null ? rec.get(PAID_AT).toInstant(ZoneOffset.UTC) : null
                ));

        return PagedResponse.of(rows, total, pageable);
    }
}
