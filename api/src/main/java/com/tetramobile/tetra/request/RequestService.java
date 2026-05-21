package com.tetramobile.tetra.request;

import com.tetramobile.tetra.request.dto.*;
import com.tetramobile.tetra.request.model.RequestStatus;
import com.tetramobile.tetra.request.model.RequestType;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface RequestService {
    RequestDetail createRequest(CreateRequestRequest body, AuthenticatedUser caller);
    PagedResponse<RequestSummary> listRequests(RequestStatus status, RequestType type,
        UUID customerId, Pageable pageable, AuthenticatedUser caller);
    RequestDetail getRequest(UUID id, AuthenticatedUser caller);
    RequestDetail updateRequest(UUID id, UpdateRequestRequest body, AuthenticatedUser caller);
    RequestPartResponse addPart(UUID requestId, AddPartRequest body);
    void deletePart(UUID requestId, UUID partId);
}
