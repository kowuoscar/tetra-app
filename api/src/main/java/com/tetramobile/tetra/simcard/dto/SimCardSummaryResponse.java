package com.tetramobile.tetra.simcard.dto;

import com.tetramobile.tetra.simcard.model.SimCard;
import com.tetramobile.tetra.simcard.model.SimStatus;
import com.tetramobile.tetra.simcard.model.SimType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SimCardSummaryResponse(
        UUID id,
        SimType type,
        BigDecimal baseMonthlyFee,
        SimStatus status,
        UUID customerId,
        UUID phoneId,
        boolean isUnused,
        Instant createdAt
) {

    public static SimCardSummaryResponse from(SimCard sim, boolean isUnused) {
        return new SimCardSummaryResponse(
                sim.getId(),
                sim.getType(),
                sim.getBaseMonthlyFee(),
                sim.getStatus(),
                sim.getCustomerId(),
                sim.getPhoneId(),
                isUnused,
                sim.getCreatedAt()
        );
    }
}
