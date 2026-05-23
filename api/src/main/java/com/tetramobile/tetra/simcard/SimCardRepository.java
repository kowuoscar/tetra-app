package com.tetramobile.tetra.simcard;

import com.tetramobile.tetra.simcard.model.SimCard;
import com.tetramobile.tetra.simcard.model.SimStatus;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SimCardRepository extends JpaRepository<SimCard, UUID> {

    List<SimCard> findByCustomerId(UUID customerId, Sort sort);

    List<SimCard> findByCustomerIdAndStatusNot(UUID customerId, SimStatus excluded, Sort sort);

    boolean existsByIdAndCustomerId(UUID simId, UUID customerId);

    long countByPhoneIdAndStatusNot(UUID phoneId, SimStatus excluded);

    Optional<SimCard> findFirstByPhoneIdAndStatusNot(UUID phoneId, SimStatus excluded);

    long countByStatusNot(SimStatus status);

    long countByPhoneIdIsNullAndStatusNot(SimStatus excluded);
}
