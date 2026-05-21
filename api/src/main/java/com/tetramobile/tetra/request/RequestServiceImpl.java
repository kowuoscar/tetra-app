package com.tetramobile.tetra.request;

import com.tetramobile.tetra.customer.CustomerRepository;
import com.tetramobile.tetra.customer.model.Customer;
import com.tetramobile.tetra.phone.PhoneRepository;
import com.tetramobile.tetra.request.dto.*;
import com.tetramobile.tetra.request.event.RequestCreatedEvent;
import com.tetramobile.tetra.request.event.RequestStatusChangedEvent;
import com.tetramobile.tetra.request.model.*;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import com.tetramobile.tetra.shared.exception.ForbiddenException;
import com.tetramobile.tetra.shared.exception.NotFoundException;
import com.tetramobile.tetra.shared.exception.UnprocessableEntityException;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import com.tetramobile.tetra.simcard.SimCardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class RequestServiceImpl implements RequestService {

    private final RequestRepository requestRepository;
    private final RequestPartRepository partRepository;
    private final AttachmentRepository attachmentRepository;
    private final CustomerRepository customerRepository;
    private final PhoneRepository phoneRepository;
    private final SimCardRepository simCardRepository;
    private final RequestQueryRepository requestQueryRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public RequestDetail createRequest(CreateRequestRequest body, AuthenticatedUser caller) {
        if (caller.isCustomer() && !body.customerId().equals(caller.customerId()))
            throw new ForbiddenException("forbidden", "Cannot submit request for another customer");

        Customer customer = customerRepository.findById(body.customerId())
            .orElseThrow(() -> new NotFoundException("Customer not found"));

        if (body.phoneId() != null &&
            !phoneRepository.existsByIdAndCustomerId(body.phoneId(), body.customerId()))
            throw new UnprocessableEntityException("invalid_phone", "Phone does not belong to customer");

        if (body.simCardId() != null &&
            !simCardRepository.existsByIdAndCustomerId(body.simCardId(), body.customerId()))
            throw new UnprocessableEntityException("invalid_sim", "SIM does not belong to customer");

        RequestAuthor author = caller.isCustomer() ? RequestAuthor.customer : RequestAuthor.company;

        Request request = new Request();
        request.setCustomerId(body.customerId());
        request.setType(body.type());
        request.setStatus(RequestStatus.submitted);
        request.setNotes(body.notes());
        request.setAuthor(author);
        request.setPhoneId(body.phoneId());
        request.setSimCardId(body.simCardId());
        requestRepository.save(request);

        eventPublisher.publishEvent(new RequestCreatedEvent(
            request.getId(), customer.getId(), request.getType(),
            author, customer.getWhatsappGroupId()
        ));

        return toDetail(request, customer.getName(), List.of(), List.of(), false);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<RequestSummary> listRequests(RequestStatus status, RequestType type,
            UUID customerId, Pageable pageable, AuthenticatedUser caller) {
        UUID effectiveCustomerId = caller.isCustomer() ? caller.customerId() : customerId;
        return requestQueryRepository.listRequests(status, type, effectiveCustomerId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public RequestDetail getRequest(UUID id, AuthenticatedUser caller) {
        Request request = findAndCheckAccess(id, caller);
        Customer customer = customerRepository.findById(request.getCustomerId()).orElseThrow();
        List<RequestPart> parts = partRepository.findByRequestId(id);
        List<Attachment> attachments = attachmentRepository.findByRequestId(id);
        boolean showTime = caller.isAdmin() && request.getDoneAt() != null;
        return toDetail(request, customer.getName(), parts, attachments, showTime);
    }

    @Override
    public RequestDetail updateRequest(UUID id, UpdateRequestRequest body, AuthenticatedUser caller) {
        SecurityUtils.requireAdminOrCompany();
        Request request = requestRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Request not found"));

        if (body.notes() != null) request.setNotes(body.notes());

        if (body.fee() != null) {
            SecurityUtils.requireAdmin();
            request.setFee(body.fee());
        }

        RequestStatus oldStatus = request.getStatus();
        if (body.status() != null && !body.status().equals(oldStatus)) {
            validateStatusTransition(oldStatus, body.status());
            request.setStatus(body.status());
            if (body.status() == RequestStatus.done) {
                request.setDoneAt(Instant.now());
            }
            Customer customer = customerRepository.findById(request.getCustomerId()).orElseThrow();
            eventPublisher.publishEvent(new RequestStatusChangedEvent(
                request.getId(), customer.getId(), oldStatus, body.status(),
                customer.getWhatsappGroupId()
            ));
        }

        requestRepository.save(request);
        Customer customer = customerRepository.findById(request.getCustomerId()).orElseThrow();
        List<RequestPart> parts = partRepository.findByRequestId(id);
        List<Attachment> attachments = attachmentRepository.findByRequestId(id);
        boolean showTime = caller.isAdmin() && request.getDoneAt() != null;
        return toDetail(request, customer.getName(), parts, attachments, showTime);
    }

    @Override
    public RequestPartResponse addPart(UUID requestId, AddPartRequest body) {
        SecurityUtils.requireAdmin();
        requestRepository.findById(requestId)
            .orElseThrow(() -> new NotFoundException("Request not found"));
        RequestPart part = new RequestPart();
        part.setRequestId(requestId);
        part.setDescription(body.description());
        part.setCost(body.cost());
        return RequestPartResponse.from(partRepository.save(part));
    }

    @Override
    public void deletePart(UUID requestId, UUID partId) {
        SecurityUtils.requireAdmin();
        RequestPart part = partRepository.findById(partId)
            .filter(p -> p.getRequestId().equals(requestId))
            .orElseThrow(() -> new NotFoundException("Part not found"));
        partRepository.delete(part);
    }

    private Request findAndCheckAccess(UUID id, AuthenticatedUser caller) {
        Request request = requestRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Request not found"));
        if (caller.isCustomer() && !request.getCustomerId().equals(caller.customerId()))
            throw new ForbiddenException("forbidden", "Access denied");
        return request;
    }

    private void validateStatusTransition(RequestStatus from, RequestStatus to) {
        boolean invalid = switch (from) {
            case submitted -> to == RequestStatus.submitted;
            case in_progress -> to == RequestStatus.submitted;
            case done -> true;
        };
        if (invalid)
            throw new UnprocessableEntityException("invalid_transition",
                "Cannot transition from " + from + " to " + to);
    }

    private RequestDetail toDetail(Request r, String customerName,
            List<RequestPart> parts, List<Attachment> attachments, boolean showTime) {
        Long timeSpent = null;
        if (showTime && r.getDoneAt() != null && r.getCreatedAt() != null) {
            timeSpent = Duration.between(r.getCreatedAt(), r.getDoneAt()).toMinutes();
        }
        return new RequestDetail(
            r.getId(), r.getCustomerId(), customerName,
            r.getType(), r.getStatus(), r.getAuthor(),
            r.getNotes(), r.getFee(),
            r.getPhoneId(), r.getSimCardId(),
            r.getCreatedAt(), r.getUpdatedAt(), r.getDoneAt(),
            parts.stream().map(RequestPartResponse::from).toList(),
            attachments.stream().map(AttachmentSummaryResponse::from).toList(),
            timeSpent
        );
    }
}
