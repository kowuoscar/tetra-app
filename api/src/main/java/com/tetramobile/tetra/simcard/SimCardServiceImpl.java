package com.tetramobile.tetra.simcard;

import com.tetramobile.tetra.customer.CustomerRepository;
import com.tetramobile.tetra.phone.PhoneRepository;
import com.tetramobile.tetra.phone.model.Phone;
import com.tetramobile.tetra.shared.exception.ForbiddenException;
import com.tetramobile.tetra.shared.exception.NotFoundException;
import com.tetramobile.tetra.shared.exception.UnprocessableEntityException;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.simcard.dto.CreateSimCardRequest;
import com.tetramobile.tetra.simcard.dto.MonthlyBillingRequest;
import com.tetramobile.tetra.simcard.dto.MonthlyBillingResponse;
import com.tetramobile.tetra.simcard.dto.SimCardSummaryResponse;
import com.tetramobile.tetra.simcard.dto.UpdateSimCardRequest;
import com.tetramobile.tetra.simcard.model.SimCard;
import com.tetramobile.tetra.simcard.model.SimMonthlyBilling;
import com.tetramobile.tetra.simcard.model.SimStatus;
import com.tetramobile.tetra.simcard.model.SimType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SimCardServiceImpl implements SimCardService {

    private final SimCardRepository simCardRepository;
    private final SimMonthlyBillingRepository simMonthlyBillingRepository;
    private final CustomerRepository customerRepository;
    private final PhoneRepository phoneRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SimCardSummaryResponse> listSimCards(UUID customerId, boolean includeCancelled,
                                                      AuthenticatedUser caller) {
        if (caller.isCustomer() && !customerId.equals(caller.customerId())) {
            throw new ForbiddenException("forbidden", "Access denied");
        }

        if (!customerRepository.existsById(customerId)) {
            throw new NotFoundException("Customer not found");
        }

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        List<SimCard> simCards = includeCancelled
                ? simCardRepository.findByCustomerId(customerId, sort)
                : simCardRepository.findByCustomerIdAndStatusNot(customerId, SimStatus.cancelled, sort);

        return simCards.stream()
                .map(sim -> SimCardSummaryResponse.from(sim, isSimUnused(sim)))
                .toList();
    }

    @Override
    @Transactional
    public SimCardSummaryResponse createSimCard(UUID customerId, CreateSimCardRequest request) {
        if (!customerRepository.existsById(customerId)) {
            throw new NotFoundException("Customer not found");
        }

        SimCard sim = new SimCard();
        sim.setType(request.type());
        sim.setBaseMonthlyFee(request.baseMonthlyFee());
        sim.setCustomerId(customerId);

        if (request.phoneId() != null) {
            validatePhoneAssignment(customerId, request.phoneId());
            sim.setPhoneId(request.phoneId());
            sim.setStatus(SimStatus.active);
        } else {
            sim.setPhoneId(null);
            sim.setStatus(SimStatus.unassigned);
        }

        SimCard saved = simCardRepository.save(sim);
        return SimCardSummaryResponse.from(saved, isSimUnused(saved));
    }

    @Override
    @Transactional
    public SimCardSummaryResponse updateSimCard(UUID simCardId, UpdateSimCardRequest request) {
        SimCard sim = simCardRepository.findById(simCardId)
                .orElseThrow(() -> new NotFoundException("SIM card not found"));

        if (request.phoneIdPresent()) {
            if (request.phoneId() == null) {
                // Explicitly unassign
                sim.setPhoneId(null);
                sim.setStatus(SimStatus.unassigned);
            } else {
                // Assign to a new phone
                validatePhoneAssignment(sim.getCustomerId(), request.phoneId());
                sim.setPhoneId(request.phoneId());
                sim.setStatus(SimStatus.active);
            }
        }

        if (request.baseMonthlyFee() != null) {
            sim.setBaseMonthlyFee(request.baseMonthlyFee());
        }

        // Status can be set directly by admin (e.g., to cancel), but phone_id changes above take precedence
        if (request.status() != null && !request.phoneIdPresent()) {
            sim.setStatus(request.status());
        }

        SimCard saved = simCardRepository.save(sim);
        return SimCardSummaryResponse.from(saved, isSimUnused(saved));
    }

    @Override
    @Transactional
    public MonthlyBillingResponse updateMonthlyBilling(UUID simCardId, MonthlyBillingRequest request) {
        SimCard sim = simCardRepository.findById(simCardId)
                .orElseThrow(() -> new NotFoundException("SIM card not found"));

        if (sim.getType() != SimType.postpaid) {
            throw new UnprocessableEntityException("sim_card_not_postpaid",
                    "Monthly billing can only be set for postpaid SIM cards");
        }

        simMonthlyBillingRepository.upsert(simCardId, request.periodMonth(), request.periodYear(),
                request.actualAmount());

        // Re-read the billing record so we return the current persisted value
        SimMonthlyBilling billing = simMonthlyBillingRepository
                .findBySimCardIdAndPeriodMonthAndPeriodYear(simCardId, request.periodMonth(), request.periodYear())
                .orElseThrow(() -> new IllegalStateException("Upsert failed to create billing record"));

        return new MonthlyBillingResponse(
                billing.getSimCardId(),
                billing.getPeriodMonth(),
                billing.getPeriodYear(),
                billing.getActualAmount()
        );
    }

    /**
     * Validates that a phone exists, belongs to the given customer, and has no non-cancelled SIM assigned.
     */
    private void validatePhoneAssignment(UUID customerId, UUID phoneId) {
        Phone phone = phoneRepository.findById(phoneId)
                .orElseThrow(() -> new NotFoundException("Phone not found"));

        if (!phone.getCustomerId().equals(customerId)) {
            throw new UnprocessableEntityException("phone_belongs_to_different_customer",
                    "The specified phone belongs to a different customer");
        }

        if (simCardRepository.countByPhoneIdAndStatusNot(phoneId, SimStatus.cancelled) > 0) {
            throw new UnprocessableEntityException("phone_already_has_sim",
                    "The specified phone already has a SIM card assigned");
        }
    }

    /**
     * is_unused = (status=active OR status=unassigned) AND phone_id IS NULL.
     */
    private boolean isSimUnused(SimCard sim) {
        boolean statusOk = sim.getStatus() == SimStatus.active
                || sim.getStatus() == SimStatus.unassigned;
        return statusOk && sim.getPhoneId() == null;
    }
}
