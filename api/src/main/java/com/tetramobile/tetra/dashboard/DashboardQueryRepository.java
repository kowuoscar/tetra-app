package com.tetramobile.tetra.dashboard;

import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import static com.tetramobile.tetra.shared.jooq.Tables.PHONES;
import static com.tetramobile.tetra.shared.jooq.Tables.SIM_CARDS;
import static org.jooq.impl.DSL.notExists;
import static org.jooq.impl.DSL.selectOne;

@Repository
@RequiredArgsConstructor
public class DashboardQueryRepository {

    private final DSLContext dsl;

    public long countActivePhonesWithoutSim() {
        return dsl.fetchCount(
                dsl.selectFrom(PHONES)
                        .where(PHONES.STATUS.eq("active"))
                        .and(notExists(
                                selectOne().from(SIM_CARDS)
                                        .where(SIM_CARDS.PHONE_ID.eq(PHONES.ID))
                                        .and(SIM_CARDS.STATUS.ne("cancelled"))
                        ))
        );
    }
}
