package com.tetramobile.tetra.simcard;

import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import com.tetramobile.tetra.simcard.dto.CreateSimCardRequest;
import com.tetramobile.tetra.simcard.dto.MonthlyBillingRequest;
import com.tetramobile.tetra.simcard.dto.MonthlyBillingResponse;
import com.tetramobile.tetra.simcard.dto.SimCardSummaryResponse;
import com.tetramobile.tetra.simcard.dto.UpdateSimCardRequest;
import com.tetramobile.tetra.simcard.model.SimProvider;
import com.tetramobile.tetra.simcard.model.SimStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SimCardController {

    private final SimCardService simCardService;

    @GetMapping("/customers/{id}/sim-cards")
    public ResponseEntity<Map<String, List<SimCardSummaryResponse>>> listSimCards(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean includeCancelled) {
        AuthenticatedUser caller = SecurityUtils.currentUser();
        List<SimCardSummaryResponse> simCards = simCardService.listSimCards(id, includeCancelled, caller);
        return ResponseEntity.ok(Map.of("sim_cards", simCards));
    }

    @PostMapping("/customers/{id}/sim-cards")
    public ResponseEntity<SimCardSummaryResponse> createSimCard(
            @PathVariable UUID id,
            @Valid @RequestBody CreateSimCardRequest request) {
        SecurityUtils.requireAdmin();
        return ResponseEntity.status(201).body(simCardService.createSimCard(id, request));
    }

    /**
     * Uses raw Map to distinguish between phone_id absent vs explicitly null.
     * phone_id absent  → no change to phone assignment
     * phone_id: null   → unassign phone
     * phone_id: uuid   → assign phone
     */
    @PatchMapping("/sim-cards/{id}")
    public ResponseEntity<SimCardSummaryResponse> updateSimCard(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) {
        SecurityUtils.requireAdmin();

        boolean phoneIdPresent = body.containsKey("phone_id");
        UUID phoneId = null;
        if (phoneIdPresent && body.get("phone_id") != null) {
            phoneId = UUID.fromString(body.get("phone_id").toString());
        }

        BigDecimal baseMonthlyFee = null;
        if (body.containsKey("base_monthly_fee") && body.get("base_monthly_fee") != null) {
            baseMonthlyFee = new BigDecimal(body.get("base_monthly_fee").toString());
        }

        SimStatus status = null;
        if (body.containsKey("status") && body.get("status") != null) {
            status = SimStatus.valueOf(body.get("status").toString());
        }

        SimProvider provider = null;
        if (body.containsKey("provider") && body.get("provider") != null) {
            provider = SimProvider.valueOf(body.get("provider").toString());
        }

        String number = null;
        if (body.containsKey("number") && body.get("number") != null) {
            number = body.get("number").toString();
        }

        UpdateSimCardRequest request = new UpdateSimCardRequest(phoneIdPresent, phoneId, baseMonthlyFee, status, provider, number);
        return ResponseEntity.ok(simCardService.updateSimCard(id, request));
    }

    @PutMapping("/sim-cards/{id}/monthly-billing")
    public ResponseEntity<MonthlyBillingResponse> updateMonthlyBilling(
            @PathVariable UUID id,
            @Valid @RequestBody MonthlyBillingRequest request) {
        SecurityUtils.requireAdmin();
        return ResponseEntity.ok(simCardService.updateMonthlyBilling(id, request));
    }
}
