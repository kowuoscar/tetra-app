package com.tetramobile.tetra.customer;

import com.tetramobile.tetra.customer.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    long countByCreatedAtAfter(Instant since);
}
