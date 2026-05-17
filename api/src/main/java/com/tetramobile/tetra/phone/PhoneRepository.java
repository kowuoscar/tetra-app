package com.tetramobile.tetra.phone;

import com.tetramobile.tetra.phone.model.Phone;
import com.tetramobile.tetra.phone.model.PhoneStatus;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PhoneRepository extends JpaRepository<Phone, UUID> {

    List<Phone> findByCustomerIdAndStatusNot(UUID customerId, PhoneStatus excluded, Sort sort);

    List<Phone> findByCustomerId(UUID customerId, Sort sort);

    boolean existsByIdAndCustomerId(UUID phoneId, UUID customerId);
}
