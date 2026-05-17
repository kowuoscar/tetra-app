package com.tetramobile.tetra.simcard;

import com.tetramobile.tetra.simcard.model.SimMonthlyBilling;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

public interface SimMonthlyBillingRepository extends JpaRepository<SimMonthlyBilling, UUID> {

    Optional<SimMonthlyBilling> findBySimCardIdAndPeriodMonthAndPeriodYear(
            UUID simCardId, int periodMonth, int periodYear);

    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO sim_monthly_billing (id, sim_card_id, period_month, period_year, actual_amount)
            VALUES (gen_random_uuid(), :simCardId, :month, :year, :amount)
            ON CONFLICT (sim_card_id, period_month, period_year)
            DO UPDATE SET actual_amount = EXCLUDED.actual_amount
            """, nativeQuery = true)
    void upsert(@Param("simCardId") UUID simCardId,
                @Param("month") int month,
                @Param("year") int year,
                @Param("amount") BigDecimal amount);
}
