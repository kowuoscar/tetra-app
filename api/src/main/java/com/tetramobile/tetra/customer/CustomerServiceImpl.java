package com.tetramobile.tetra.customer;

import com.tetramobile.tetra.customer.dto.CostBreakdownResponse;
import com.tetramobile.tetra.customer.dto.CostBreakdownResponse.RequestFeeItem;
import com.tetramobile.tetra.customer.dto.CostBreakdownResponse.SimFeeItem;
import com.tetramobile.tetra.customer.dto.CreateCustomerRequest;
import com.tetramobile.tetra.customer.dto.CustomerDetailResponse;
import com.tetramobile.tetra.customer.dto.CustomerSummaryResponse;
import com.tetramobile.tetra.customer.dto.UpdateCustomerRequest;
import com.tetramobile.tetra.customer.model.Customer;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import com.tetramobile.tetra.shared.exception.ForbiddenException;
import com.tetramobile.tetra.shared.exception.NotFoundException;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.simcard.SimCardRepository;
import com.tetramobile.tetra.simcard.SimMonthlyBillingRepository;
import com.tetramobile.tetra.simcard.model.SimCard;
import com.tetramobile.tetra.simcard.model.SimStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerQueryRepository customerQueryRepository;
    private final SimCardRepository simCardRepository;
    private final SimMonthlyBillingRepository simMonthlyBillingRepository;

    @Override
    @Transactional
    public CustomerDetailResponse createCustomer(CreateCustomerRequest request) {
        Customer customer = new Customer();
        customer.setName(request.name());
        customer.setContactInfo(request.contactInfo());
        customer.setWhatsappGroupId(request.whatsappGroupId());
        return CustomerDetailResponse.from(customerRepository.save(customer));
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerDetailResponse getCustomer(UUID id, AuthenticatedUser caller) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Customer not found"));
        if (caller.isCustomer() && !id.equals(caller.customerId())) {
            throw new ForbiddenException("forbidden", "Access denied");
        }
        return CustomerDetailResponse.from(customer);
    }

    @Override
    @Transactional
    public CustomerDetailResponse updateCustomer(UUID id, UpdateCustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Customer not found"));
        if (request.name() != null) customer.setName(request.name());
        if (request.contactInfo() != null) customer.setContactInfo(request.contactInfo());
        if (request.whatsappGroupId() != null) customer.setWhatsappGroupId(request.whatsappGroupId());
        return CustomerDetailResponse.from(customerRepository.save(customer));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<CustomerSummaryResponse> listCustomers(String search, Pageable pageable) {
        return PagedResponse.from(customerQueryRepository.listWithStats(search, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public CostBreakdownResponse getCostBreakdown(UUID customerId, int month, int year) {
        if (!customerRepository.existsById(customerId)) {
            throw new NotFoundException("Customer not found");
        }

        List<SimCard> sims = simCardRepository.findByCustomerIdAndStatusNot(
                customerId, SimStatus.cancelled, Sort.by("createdAt"));

        List<SimFeeItem> simFees = sims.stream().map(sim -> {
            var billing = simMonthlyBillingRepository
                    .findBySimCardIdAndPeriodMonthAndPeriodYear(sim.getId(), month, year);
            if (billing.isPresent()) {
                return new SimFeeItem(sim.getId(), sim.getType().name(),
                        billing.get().getActualAmount(), true);
            } else {
                return new SimFeeItem(sim.getId(), sim.getType().name(),
                        sim.getBaseMonthlyFee(), false);
            }
        }).toList();

        List<RequestFeeItem> requestFees = List.of(); // plan-03 populates this

        BigDecimal total = simFees.stream()
                .map(SimFeeItem::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CostBreakdownResponse(month, year, simFees, requestFees, total);
    }
}
