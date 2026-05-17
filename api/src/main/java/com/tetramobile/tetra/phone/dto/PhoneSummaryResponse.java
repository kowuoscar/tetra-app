package com.tetramobile.tetra.phone.dto;

import com.tetramobile.tetra.phone.model.Ownership;
import com.tetramobile.tetra.phone.model.Phone;
import com.tetramobile.tetra.phone.model.PhoneStatus;
import com.tetramobile.tetra.simcard.model.SimCard;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PhoneSummaryResponse(
        UUID id,
        String model,
        Ownership ownership,
        PhoneStatus status,
        UUID customerId,
        SimInfo simCard,
        boolean isUnused,
        Instant createdAt
) {

    public record SimInfo(UUID id, String type, BigDecimal baseMonthlyFee) {}

    public static PhoneSummaryResponse from(Phone phone, SimCard sim, boolean isUnused) {
        SimInfo simInfo = sim != null
                ? new SimInfo(sim.getId(), sim.getType().name(), sim.getBaseMonthlyFee())
                : null;
        return new PhoneSummaryResponse(
                phone.getId(),
                phone.getModel(),
                phone.getOwnership(),
                phone.getStatus(),
                phone.getCustomerId(),
                simInfo,
                isUnused,
                phone.getCreatedAt()
        );
    }
}
