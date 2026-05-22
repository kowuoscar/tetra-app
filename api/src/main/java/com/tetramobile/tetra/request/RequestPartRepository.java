package com.tetramobile.tetra.request;

import com.tetramobile.tetra.request.model.RequestPart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RequestPartRepository extends JpaRepository<RequestPart, UUID> {
    List<RequestPart> findByRequestId(UUID requestId);
}
