package com.tetramobile.tetra.customer;

import com.tetramobile.tetra.customer.dto.CreateCustomerRequest;
import com.tetramobile.tetra.customer.dto.CustomerDetailResponse;
import com.tetramobile.tetra.customer.dto.UpdateCustomerRequest;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;

import java.util.UUID;

public interface CustomerService {

    CustomerDetailResponse createCustomer(CreateCustomerRequest request);

    CustomerDetailResponse getCustomer(UUID id, AuthenticatedUser caller);

    CustomerDetailResponse updateCustomer(UUID id, UpdateCustomerRequest request);
}
