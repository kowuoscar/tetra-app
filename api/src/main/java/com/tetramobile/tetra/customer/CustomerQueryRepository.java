package com.tetramobile.tetra.customer;

import com.tetramobile.tetra.customer.dto.CostBreakdownResponse;
import com.tetramobile.tetra.customer.dto.CostBreakdownResponse.SimFeeItem;
import com.tetramobile.tetra.customer.dto.CustomerSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.SelectQuery;
import org.jooq.impl.DSL;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.tetramobile.tetra.shared.jooq.Tables.*;
import static org.jooq.impl.DSL.*;

@Repository
@RequiredArgsConstructor
public class CustomerQueryRepository {

    private final DSLContext dsl;

    public Page<CustomerSummaryResponse> listWithStats(String search, Pageable pageable) {
        var customers = CUSTOMERS.as("c");
        var phones    = PHONES.as("p");
        var simCards  = SIM_CARDS.as("s");
        var requests  = REQUESTS.as("r");
        var smb       = SIM_MONTHLY_BILLING.as("smb");

        LocalDate now   = LocalDate.now();
        int month = now.getMonthValue();
        int year  = now.getYear();

        // Correlated subquery: non-replaced phones
        var phoneCount = dsl.selectCount()
                .from(phones)
                .where(phones.CUSTOMER_ID.eq(customers.ID)
                        .and(phones.STATUS.ne("replaced")))
                .asField("phone_count");

        // Correlated subquery: non-cancelled SIM cards
        var simCount = dsl.selectCount()
                .from(simCards)
                .where(simCards.CUSTOMER_ID.eq(customers.ID)
                        .and(simCards.STATUS.ne("cancelled")))
                .asField("sim_card_count");

        // Correlated subquery: open requests (status != 'done')
        var openReqCount = dsl.selectCount()
                .from(requests)
                .where(requests.CUSTOMER_ID.eq(customers.ID)
                        .and(requests.STATUS.ne("done")))
                .asField("open_request_count");

        // Correlated subquery: current-month SIM fee sum
        var simFeeSum = dsl
                .select(DSL.coalesce(
                        DSL.sum(
                                DSL.when(smb.ACTUAL_AMOUNT.isNotNull(), smb.ACTUAL_AMOUNT)
                                   .otherwise(simCards.BASE_MONTHLY_FEE)),
                        BigDecimal.ZERO))
                .from(simCards)
                .leftJoin(smb).on(smb.SIM_CARD_ID.eq(simCards.ID)
                        .and(smb.PERIOD_MONTH.eq(month))
                        .and(smb.PERIOD_YEAR.eq(year)))
                .where(simCards.CUSTOMER_ID.eq(customers.ID)
                        .and(simCards.STATUS.ne("cancelled")))
                .asField("current_month_cost");

        // Build query using SelectQuery for type-safe optional WHERE
        SelectQuery<?> q = dsl.selectQuery();
        q.addSelect(
                customers.ID,
                customers.NAME,
                customers.CONTACT_INFO,
                customers.CREATED_AT,
                phoneCount,
                simCount,
                openReqCount,
                simFeeSum);
        q.addFrom(customers);

        if (search != null && !search.isBlank()) {
            q.addConditions(DSL.lower(customers.NAME).contains(search.toLowerCase()));
        }

        int total = dsl.fetchCount(q);

        q.addOrderBy(customers.NAME.asc());
        q.addLimit(pageable.getPageSize());
        q.addOffset((int) pageable.getOffset());

        List<CustomerSummaryResponse> rows = q.fetch(rec -> new CustomerSummaryResponse(
                rec.get(customers.ID),
                rec.get(customers.NAME),
                rec.get(customers.CONTACT_INFO),
                rec.get("phone_count", Integer.class),
                rec.get("sim_card_count", Integer.class),
                rec.get("open_request_count", Integer.class),
                rec.get("current_month_cost", BigDecimal.class),
                rec.get(customers.CREATED_AT).toInstant(ZoneOffset.UTC)
        ));

        return new PageImpl<>(rows, pageable, total);
    }

    public record CustomerStats(
            int phoneCount,
            int simCardCount,
            int openRequestCount,
            BigDecimal currentMonthCost) {}

    public Optional<CustomerStats> getSingleCustomerStats(UUID customerId) {
        var customers = CUSTOMERS.as("c");
        var phones    = PHONES.as("p");
        var simCards  = SIM_CARDS.as("s");
        var requests  = REQUESTS.as("r");
        var smb       = SIM_MONTHLY_BILLING.as("smb");

        LocalDate now  = LocalDate.now();
        int month = now.getMonthValue();
        int year  = now.getYear();

        var phoneCount = dsl.selectCount()
                .from(phones)
                .where(phones.CUSTOMER_ID.eq(customers.ID)
                        .and(phones.STATUS.ne("replaced")))
                .asField("phone_count");

        var simCount = dsl.selectCount()
                .from(simCards)
                .where(simCards.CUSTOMER_ID.eq(customers.ID)
                        .and(simCards.STATUS.ne("cancelled")))
                .asField("sim_card_count");

        var openReqCount = dsl.selectCount()
                .from(requests)
                .where(requests.CUSTOMER_ID.eq(customers.ID)
                        .and(requests.STATUS.ne("done")))
                .asField("open_request_count");

        var simFeeSum = dsl
                .select(DSL.coalesce(
                        DSL.sum(
                                DSL.when(smb.ACTUAL_AMOUNT.isNotNull(), smb.ACTUAL_AMOUNT)
                                   .otherwise(simCards.BASE_MONTHLY_FEE)),
                        BigDecimal.ZERO))
                .from(simCards)
                .leftJoin(smb).on(smb.SIM_CARD_ID.eq(simCards.ID)
                        .and(smb.PERIOD_MONTH.eq(month))
                        .and(smb.PERIOD_YEAR.eq(year)))
                .where(simCards.CUSTOMER_ID.eq(customers.ID)
                        .and(simCards.STATUS.ne("cancelled")))
                .asField("current_month_cost");

        Record rec = dsl.select(phoneCount, simCount, openReqCount, simFeeSum)
                .from(customers)
                .where(customers.ID.eq(customerId))
                .fetchOne();

        if (rec == null) {
            return Optional.empty();
        }
        return Optional.of(new CustomerStats(
                rec.get("phone_count", Integer.class),
                rec.get("sim_card_count", Integer.class),
                rec.get("open_request_count", Integer.class),
                rec.get("current_month_cost", BigDecimal.class)));
    }

    public CostBreakdownResponse getCostBreakdown(UUID customerId, int month, int year) {
        var simCards = SIM_CARDS.as("s");
        var smb      = SIM_MONTHLY_BILLING.as("smb");

        List<SimFeeItem> simFees = dsl
                .select(
                        simCards.ID,
                        simCards.TYPE,
                        simCards.BASE_MONTHLY_FEE,
                        smb.ACTUAL_AMOUNT)
                .from(simCards)
                .leftJoin(smb).on(smb.SIM_CARD_ID.eq(simCards.ID)
                        .and(smb.PERIOD_MONTH.eq(month))
                        .and(smb.PERIOD_YEAR.eq(year)))
                .where(simCards.CUSTOMER_ID.eq(customerId)
                        .and(simCards.STATUS.ne("cancelled")))
                .orderBy(simCards.CREATED_AT.asc())
                .fetch(rec -> {
                    boolean isActual = rec.get(smb.ACTUAL_AMOUNT) != null;
                    BigDecimal amount = isActual
                            ? rec.get(smb.ACTUAL_AMOUNT)
                            : rec.get(simCards.BASE_MONTHLY_FEE);
                    return new SimFeeItem(
                            rec.get(simCards.ID),
                            rec.get(simCards.TYPE),
                            amount,
                            isActual);
                });

        var r = REQUESTS.as("r");
        var p = REQUEST_PARTS.as("p");

        List<CostBreakdownResponse.RequestFeeItem> requestFees = dsl
                .select(r.ID.as("request_id"), r.TYPE.as("request_type"),
                        coalesce(sum(p.COST), BigDecimal.ZERO).as("amount"))
                .from(r)
                .leftJoin(p).on(p.REQUEST_ID.eq(r.ID))
                .where(r.CUSTOMER_ID.eq(customerId)
                        .and(r.STATUS.eq("done"))
                        .and(month(r.DONE_AT).eq(month))
                        .and(year(r.DONE_AT).eq(year)))
                .groupBy(r.ID, r.TYPE)
                .fetch(rec -> new CostBreakdownResponse.RequestFeeItem(
                        rec.get("request_id", UUID.class),
                        rec.get("request_type", String.class),
                        rec.get("amount", BigDecimal.class)
                ));

        BigDecimal requestTotal = requestFees.stream()
                .map(CostBreakdownResponse.RequestFeeItem::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal total = simFees.stream()
                .map(SimFeeItem::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .add(requestTotal);

        return new CostBreakdownResponse(month, year, simFees, requestFees, total);
    }
}
