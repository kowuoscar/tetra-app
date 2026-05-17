package com.tetramobile.tetra.customer;

import com.tetramobile.tetra.customer.dto.CostBreakdownResponse;
import com.tetramobile.tetra.customer.dto.CreateCustomerRequest;
import com.tetramobile.tetra.customer.dto.CustomerDetailResponse;
import com.tetramobile.tetra.customer.dto.CustomerSummaryResponse;
import com.tetramobile.tetra.customer.dto.UpdateCustomerRequest;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import com.tetramobile.tetra.shared.exception.ForbiddenException;
import com.tetramobile.tetra.shared.exception.UnprocessableEntityException;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public ResponseEntity<PagedResponse<CustomerSummaryResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") @Max(100) int size) {
        SecurityUtils.requireAdminOrCompany();
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(customerService.listCustomers(search, pageable));
    }

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

    @GetMapping("/{id}/cost-breakdown")
    public ResponseEntity<CostBreakdownResponse> costBreakdown(
            @PathVariable UUID id,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        if (month == null || year == null) {
            throw new UnprocessableEntityException("missing_period", "month and year are required");
        }
        AuthenticatedUser caller = SecurityUtils.currentUser();
        if (caller.isCustomer() && !id.equals(caller.customerId())) {
            throw new ForbiddenException("forbidden", "Access denied");
        }
        return ResponseEntity.ok(customerService.getCostBreakdown(id, month, year));
    }
}
