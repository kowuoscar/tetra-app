package com.tetramobile.tetra.customer;

import com.tetramobile.tetra.customer.dto.CostBreakdownResponse;
import com.tetramobile.tetra.customer.dto.CreateCustomerRequest;
import com.tetramobile.tetra.customer.dto.CustomerDetailResponse;
import com.tetramobile.tetra.customer.dto.CustomerSummaryResponse;
import com.tetramobile.tetra.customer.dto.UpdateCustomerRequest;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CustomerService {

    CustomerDetailResponse createCustomer(CreateCustomerRequest request);

    CustomerDetailResponse getCustomer(UUID id, AuthenticatedUser caller);

    CustomerDetailResponse updateCustomer(UUID id, UpdateCustomerRequest request);

    PagedResponse<CustomerSummaryResponse> listCustomers(String search, Pageable pageable);

    CostBreakdownResponse getCostBreakdown(UUID customerId, int month, int year, AuthenticatedUser caller);
}
