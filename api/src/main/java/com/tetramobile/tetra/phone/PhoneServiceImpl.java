package com.tetramobile.tetra.phone;

import com.tetramobile.tetra.customer.CustomerRepository;
import com.tetramobile.tetra.phone.dto.CreatePhoneRequest;
import com.tetramobile.tetra.phone.dto.PhoneSummaryResponse;
import com.tetramobile.tetra.phone.dto.UpdatePhoneRequest;
import com.tetramobile.tetra.phone.model.Phone;
import com.tetramobile.tetra.phone.model.PhoneStatus;
import com.tetramobile.tetra.shared.exception.ForbiddenException;
import com.tetramobile.tetra.shared.exception.NotFoundException;
import com.tetramobile.tetra.shared.exception.UnprocessableEntityException;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.simcard.SimCardRepository;
import com.tetramobile.tetra.simcard.model.SimCard;
import com.tetramobile.tetra.simcard.model.SimStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PhoneServiceImpl implements PhoneService {

    private final PhoneRepository phoneRepository;
    private final SimCardRepository simCardRepository;
    private final CustomerRepository customerRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PhoneSummaryResponse> listPhones(UUID customerId, boolean includeReplaced, AuthenticatedUser caller) {
        // Customer role can only access their own resources
        if (caller.isCustomer() && !customerId.equals(caller.customerId())) {
            throw new ForbiddenException("forbidden", "Access denied");
        }

        if (!customerRepository.existsById(customerId)) {
            throw new NotFoundException("Customer not found");
        }

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        List<Phone> phones = includeReplaced
                ? phoneRepository.findByCustomerId(customerId, sort)
                : phoneRepository.findByCustomerIdAndStatusNot(customerId, PhoneStatus.replaced, sort);

        return phones.stream()
                .map(phone -> {
                    SimCard assignedSim = simCardRepository
                            .findFirstByPhoneIdAndStatusNot(phone.getId(), SimStatus.cancelled)
                            .orElse(null);
                    boolean isUnused = isPhoneUnused(phone, assignedSim);
                    return PhoneSummaryResponse.from(phone, assignedSim, isUnused);
                })
                .toList();
    }

    @Override
    @Transactional
    public PhoneSummaryResponse createPhone(UUID customerId, CreatePhoneRequest request) {
        if (!customerRepository.existsById(customerId)) {
            throw new NotFoundException("Customer not found");
        }

        Phone phone = new Phone();
        phone.setModel(request.model());
        phone.setOwnership(request.ownership());
        phone.setCustomerId(customerId);
        phone.setStatus(PhoneStatus.active);

        Phone saved = phoneRepository.save(phone);
        // Newly created phone has no SIM and is_unused=true
        return PhoneSummaryResponse.from(saved, null, true);
    }

    @Override
    @Transactional
    public PhoneSummaryResponse updatePhone(UUID phoneId, UpdatePhoneRequest request) {
        Phone phone = phoneRepository.findById(phoneId)
                .orElseThrow(() -> new NotFoundException("Phone not found"));

        // Setting status=replaced via PATCH is forbidden — only request side-effects can do this
        if (request.status() == PhoneStatus.replaced) {
            throw new UnprocessableEntityException("invalid_status_transition",
                    "Status 'replaced' cannot be set via PATCH — use a phone_replacement request");
        }

        if (request.model() != null) {
            phone.setModel(request.model());
        }
        if (request.ownership() != null) {
            phone.setOwnership(request.ownership());
        }
        if (request.status() != null) {
            phone.setStatus(request.status());
        }

        Phone saved = phoneRepository.save(phone);

        SimCard assignedSim = simCardRepository
                .findFirstByPhoneIdAndStatusNot(saved.getId(), SimStatus.cancelled)
                .orElse(null);
        boolean isUnused = isPhoneUnused(saved, assignedSim);
        return PhoneSummaryResponse.from(saved, assignedSim, isUnused);
    }

    /**
     * is_unused = (status=active OR status=in_repair) AND no non-cancelled SIM references this phone.
     */
    private boolean isPhoneUnused(Phone phone, SimCard assignedSim) {
        boolean statusOk = phone.getStatus() == PhoneStatus.active
                || phone.getStatus() == PhoneStatus.in_repair;
        return statusOk && assignedSim == null;
    }
}
