package com.tetramobile.tetra.dashboard;

import com.tetramobile.tetra.customer.CustomerRepository;
import com.tetramobile.tetra.dashboard.dto.DashboardStatsResponse;
import com.tetramobile.tetra.phone.PhoneRepository;
import com.tetramobile.tetra.phone.model.PhoneStatus;
import com.tetramobile.tetra.request.RequestRepository;
import com.tetramobile.tetra.simcard.SimCardRepository;
import com.tetramobile.tetra.simcard.model.SimStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final CustomerRepository customerRepository;
    private final PhoneRepository phoneRepository;
    private final SimCardRepository simCardRepository;
    private final RequestRepository requestRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats() {
        long totalCustomers = customerRepository.count();
        long totalPhones    = phoneRepository.countByStatusNot(PhoneStatus.replaced);
        long totalSimCards  = simCardRepository.countByStatusNot(SimStatus.cancelled);
        long openRequests   = requestRepository.countByStatusNot("done");
        return new DashboardStatsResponse(totalCustomers, totalPhones, totalSimCards, openRequests);
    }
}
