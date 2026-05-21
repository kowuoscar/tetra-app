package com.tetramobile.tetra.simcard;

import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.simcard.dto.CreateSimCardRequest;
import com.tetramobile.tetra.simcard.dto.MonthlyBillingRequest;
import com.tetramobile.tetra.simcard.dto.MonthlyBillingResponse;
import com.tetramobile.tetra.simcard.dto.SimCardSummaryResponse;
import com.tetramobile.tetra.simcard.dto.UpdateSimCardRequest;

import java.util.List;
import java.util.UUID;

public interface SimCardService {

    List<SimCardSummaryResponse> listSimCards(UUID customerId, boolean includeCancelled, AuthenticatedUser caller);

    SimCardSummaryResponse createSimCard(UUID customerId, CreateSimCardRequest request);

    SimCardSummaryResponse updateSimCard(UUID simCardId, UpdateSimCardRequest request);

    MonthlyBillingResponse updateMonthlyBilling(UUID simCardId, MonthlyBillingRequest request);
}
