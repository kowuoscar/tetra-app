package com.tetramobile.tetra.request;

import com.tetramobile.tetra.request.model.Request;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Stub repository — plan-02 only. Extended in plan-03.
 */
public interface RequestRepository extends JpaRepository<Request, UUID> {

    long countByStatusNot(String status);
}
