package com.tetramobile.tetra.phone;

import com.tetramobile.tetra.phone.dto.CreatePhoneRequest;
import com.tetramobile.tetra.phone.dto.PhoneSummaryResponse;
import com.tetramobile.tetra.phone.dto.UpdatePhoneRequest;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PhoneController {

    private final PhoneService phoneService;

    @GetMapping("/customers/{id}/phones")
    public ResponseEntity<Map<String, List<PhoneSummaryResponse>>> listPhones(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean includeReplaced) {
        AuthenticatedUser caller = SecurityUtils.currentUser();
        List<PhoneSummaryResponse> phones = phoneService.listPhones(id, includeReplaced, caller);
        return ResponseEntity.ok(Map.of("phones", phones));
    }

    @PostMapping("/customers/{id}/phones")
    public ResponseEntity<PhoneSummaryResponse> createPhone(
            @PathVariable UUID id,
            @Valid @RequestBody CreatePhoneRequest request) {
        SecurityUtils.requireAdmin();
        return ResponseEntity.status(201).body(phoneService.createPhone(id, request));
    }

    @PatchMapping("/phones/{id}")
    public ResponseEntity<PhoneSummaryResponse> updatePhone(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePhoneRequest request) {
        SecurityUtils.requireAdmin();
        return ResponseEntity.ok(phoneService.updatePhone(id, request));
    }
}
