package com.tetramobile.tetra.customer;

import com.tetramobile.tetra.customer.CustomerQueryRepository.CustomerStats;
import com.tetramobile.tetra.customer.dto.CostBreakdownResponse;
import com.tetramobile.tetra.customer.dto.CreateCustomerRequest;
import com.tetramobile.tetra.customer.dto.CustomerDetailResponse;
import com.tetramobile.tetra.customer.dto.CustomerSummaryResponse;
import com.tetramobile.tetra.customer.dto.UpdateCustomerRequest;
import com.tetramobile.tetra.customer.model.Customer;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import com.tetramobile.tetra.shared.exception.ForbiddenException;
import com.tetramobile.tetra.shared.exception.NotFoundException;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerQueryRepository customerQueryRepository;

    @Override
    @Transactional
    public CustomerDetailResponse createCustomer(CreateCustomerRequest request) {
        Customer customer = new Customer();
        customer.setName(request.name().toLowerCase());
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
        CustomerStats stats = customerQueryRepository.getSingleCustomerStats(id)
                .orElse(new CustomerStats(0, 0, 0, BigDecimal.ZERO));
        return CustomerDetailResponse.from(customer,
                stats.phoneCount(), stats.simCardCount(),
                stats.openRequestCount(), stats.currentMonthCost());
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
    public CostBreakdownResponse getCostBreakdown(UUID customerId, int month, int year, AuthenticatedUser caller) {
        if (!customerRepository.existsById(customerId)) {
            throw new NotFoundException("Customer not found");
        }
        if (caller.isCustomer() && !customerId.equals(caller.customerId())) {
            throw new ForbiddenException("forbidden", "Access denied");
        }
        return customerQueryRepository.getCostBreakdown(customerId, month, year);
    }
}
