package com.tetramobile.tetra.customer;

import com.tetramobile.tetra.customer.dto.CreateCustomerRequest;
import com.tetramobile.tetra.customer.dto.CustomerDetailResponse;
import com.tetramobile.tetra.customer.dto.UpdateCustomerRequest;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    public ResponseEntity<CustomerDetailResponse> create(
            @Valid @RequestBody CreateCustomerRequest request) {
        SecurityUtils.requireAdmin();
        return ResponseEntity.status(201).body(customerService.createCustomer(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerDetailResponse> get(@PathVariable UUID id) {
        // All three roles may call this endpoint — ownership enforcement is in the service.
        AuthenticatedUser caller = SecurityUtils.currentUser();
        return ResponseEntity.ok(customerService.getCustomer(id, caller));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<CustomerDetailResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCustomerRequest request) {
        SecurityUtils.requireAdmin();
        return ResponseEntity.ok(customerService.updateCustomer(id, request));
    }
}
