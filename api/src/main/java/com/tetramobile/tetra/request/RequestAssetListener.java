package com.tetramobile.tetra.request;

import com.tetramobile.tetra.phone.PhoneRepository;
import com.tetramobile.tetra.phone.model.Ownership;
import com.tetramobile.tetra.phone.model.Phone;
import com.tetramobile.tetra.phone.model.PhoneStatus;
import com.tetramobile.tetra.request.event.RequestStatusChangedEvent;
import com.tetramobile.tetra.request.model.Request;
import com.tetramobile.tetra.request.model.RequestStatus;
import com.tetramobile.tetra.simcard.SimCardRepository;
import com.tetramobile.tetra.simcard.model.SimCard;
import com.tetramobile.tetra.simcard.model.SimStatus;
import com.tetramobile.tetra.simcard.model.SimType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
@Slf4j
public class RequestAssetListener {

    private final PhoneRepository phoneRepository;
    private final SimCardRepository simCardRepository;
    private final RequestRepository requestRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleStatusChanged(RequestStatusChangedEvent event) {
        if (event.newStatus() != RequestStatus.done) return;

        Request request = requestRepository.findById(event.requestId()).orElseThrow();

        switch (request.getType()) {
            case phone_repair -> {
                if (request.getPhoneId() != null) {
                    phoneRepository.findById(request.getPhoneId()).ifPresent(phone -> {
                        phone.setStatus(PhoneStatus.active);
                        phoneRepository.save(phone);
                    });
                }
            }
            case phone_replacement -> {
                if (request.getPhoneId() != null) {
                    phoneRepository.findById(request.getPhoneId()).ifPresent(old -> {
                        old.setStatus(PhoneStatus.replaced);
                        phoneRepository.save(old);
                    });
                }
                Phone newPhone = new Phone();
                newPhone.setCustomerId(request.getCustomerId());
                newPhone.setModel(request.getNotes() != null
                    ? request.getNotes() : "Replacement phone");
                newPhone.setOwnership(Ownership.company);
                newPhone.setStatus(PhoneStatus.active);
                phoneRepository.save(newPhone);
            }
            case new_sim -> {
                SimCard sim = new SimCard();
                sim.setCustomerId(request.getCustomerId());
                sim.setType(SimType.prepaid);
                sim.setStatus(SimStatus.active);
                sim.setBaseMonthlyFee(BigDecimal.ZERO);
                simCardRepository.save(sim);
            }
            default -> log.debug("No asset side-effect for type={}", request.getType());
        }
    }
}
