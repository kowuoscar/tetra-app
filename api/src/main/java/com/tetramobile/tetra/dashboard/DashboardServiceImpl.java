package com.tetramobile.tetra.dashboard;

import com.tetramobile.tetra.customer.CustomerRepository;
import com.tetramobile.tetra.dashboard.dto.DashboardStatsResponse;
import com.tetramobile.tetra.phone.PhoneRepository;
import com.tetramobile.tetra.phone.model.PhoneStatus;
import com.tetramobile.tetra.request.RequestRepository;
import com.tetramobile.tetra.request.model.RequestStatus;
import com.tetramobile.tetra.simcard.SimCardRepository;
import com.tetramobile.tetra.simcard.model.SimStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final CustomerRepository     customerRepository;
    private final PhoneRepository        phoneRepository;
    private final SimCardRepository      simCardRepository;
    private final RequestRepository      requestRepository;
    private final DashboardQueryRepository dashboardQueryRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats() {
        var monthStart = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1)
                .atStartOfDay().toInstant(ZoneOffset.UTC);

        long totalCustomers        = customerRepository.count();
        long totalPhones           = phoneRepository.countByStatusNot(PhoneStatus.replaced);
        long totalSimCards         = simCardRepository.countByStatusNot(SimStatus.cancelled);
        long openRequests          = requestRepository.countByStatusNot(RequestStatus.done);
        long newCustomersThisMonth = customerRepository.countByCreatedAtAfter(monthStart);
        long phonesInRepair        = phoneRepository.countByStatus(PhoneStatus.in_repair);
        long unassignedSimCards    = simCardRepository.countByPhoneIdIsNullAndStatusNot(SimStatus.cancelled);
        long submittedRequests     = requestRepository.countByStatus(RequestStatus.submitted);
        long inProgressRequests    = requestRepository.countByStatus(RequestStatus.in_progress);
        long phonesWithoutSim      = dashboardQueryRepository.countActivePhonesWithoutSim();

        return new DashboardStatsResponse(
                totalCustomers, totalPhones, totalSimCards, openRequests,
                newCustomersThisMonth, phonesInRepair, unassignedSimCards,
                submittedRequests, inProgressRequests, phonesWithoutSim
        );
    }
}
