package com.tetramobile.tetra.request;

import com.tetramobile.tetra.request.dto.*;
import com.tetramobile.tetra.request.model.RequestStatus;
import com.tetramobile.tetra.request.model.RequestType;
import com.tetramobile.tetra.shared.dto.PagedResponse;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/requests")
@RequiredArgsConstructor
public class RequestController {

    private final RequestService requestService;

    @PostMapping
    public ResponseEntity<RequestDetail> create(@RequestBody @Valid CreateRequestRequest body) {
        return ResponseEntity.status(201)
            .body(requestService.createRequest(body, SecurityUtils.currentUser()));
    }

    @GetMapping
    public ResponseEntity<PagedResponse<RequestSummary>> list(
            @RequestParam(required = false) RequestStatus status,
            @RequestParam(required = false) RequestType type,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") @Max(100) int size) {
        return ResponseEntity.ok(requestService.listRequests(
            status, type, customerId,
            PageRequest.of(page, size),
            SecurityUtils.currentUser()
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequestDetail> get(@PathVariable UUID id) {
        return ResponseEntity.ok(requestService.getRequest(id, SecurityUtils.currentUser()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<RequestDetail> update(
            @PathVariable UUID id,
            @RequestBody @Valid UpdateRequestRequest body) {
        return ResponseEntity.ok(requestService.updateRequest(id, body, SecurityUtils.currentUser()));
    }

    @PostMapping("/{id}/parts")
    public ResponseEntity<RequestPartResponse> addPart(
            @PathVariable UUID id,
            @RequestBody @Valid AddPartRequest body) {
        return ResponseEntity.status(201).body(requestService.addPart(id, body));
    }

    @DeleteMapping("/{id}/parts/{partId}")
    public ResponseEntity<Void> deletePart(@PathVariable UUID id, @PathVariable UUID partId) {
        requestService.deletePart(id, partId);
        return ResponseEntity.noContent().build();
    }
}
