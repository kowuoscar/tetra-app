package com.tetramobile.tetra.simcard.dto;

import com.tetramobile.tetra.simcard.model.SimStatus;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * PATCH /sim-cards/{id} request body.
 *
 * phone_id handling:
 *   - Field absent in JSON → phoneIdPresent=false, phoneId=null → no change to phone assignment
 *   - Field explicitly null in JSON → phoneIdPresent=true, phoneId=null → unassign phone
 *   - Field set to UUID in JSON → phoneIdPresent=true, phoneId=UUID → assign phone
 *
 * The controller sets phoneIdPresent when it detects the key in the raw request.
 */
public record UpdateSimCardRequest(
        boolean phoneIdPresent,
        UUID phoneId,
        BigDecimal baseMonthlyFee,
        SimStatus status
) {}
