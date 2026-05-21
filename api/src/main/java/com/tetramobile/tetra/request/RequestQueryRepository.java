package com.tetramobile.tetra.request;

import com.tetramobile.tetra.request.dto.RequestSummary;
import com.tetramobile.tetra.request.model.RequestAuthor;
import com.tetramobile.tetra.request.model.RequestStatus;
import com.tetramobile.tetra.request.model.RequestType;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import lombok.RequiredArgsConstructor;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.ZoneOffset;
import java.util.UUID;

import static com.tetramobile.tetra.shared.jooq.Tables.CUSTOMERS;
import static com.tetramobile.tetra.shared.jooq.Tables.REQUESTS;

@Repository
@RequiredArgsConstructor
public class RequestQueryRepository {

    private final DSLContext dsl;

    public PagedResponse<RequestSummary> listRequests(
            RequestStatus status, RequestType type,
            UUID customerId, Pageable pageable) {

        var r = REQUESTS.as("r");
        var c = CUSTOMERS.as("c");

        Condition condition = DSL.trueCondition();
        if (status != null) condition = condition.and(r.STATUS.eq(status.name()));
        if (type != null) condition = condition.and(r.TYPE.eq(type.name()));
        if (customerId != null) condition = condition.and(r.CUSTOMER_ID.eq(customerId));

        var query = dsl.select(
                r.ID, r.CUSTOMER_ID, c.NAME.as("customer_name"),
                r.TYPE, r.STATUS, r.AUTHOR, r.FEE, r.CREATED_AT, r.DONE_AT
            )
            .from(r)
            .join(c).on(c.ID.eq(r.CUSTOMER_ID))
            .where(condition);

        int total = dsl.fetchCount(query);
        var rows = query
            .orderBy(r.CREATED_AT.desc())
            .limit(pageable.getPageSize())
            .offset(pageable.getOffset())
            .fetch(rec -> new RequestSummary(
                rec.get(r.ID),
                rec.get(r.CUSTOMER_ID),
                rec.get("customer_name", String.class),
                RequestType.valueOf(rec.get(r.TYPE)),
                RequestStatus.valueOf(rec.get(r.STATUS)),
                RequestAuthor.valueOf(rec.get(r.AUTHOR)),
                rec.get(r.FEE),
                rec.get(r.CREATED_AT).toInstant(ZoneOffset.UTC),
                rec.get(r.DONE_AT) != null ? rec.get(r.DONE_AT).toInstant(ZoneOffset.UTC) : null
            ));

        return PagedResponse.of(rows, total, pageable);
    }
}
