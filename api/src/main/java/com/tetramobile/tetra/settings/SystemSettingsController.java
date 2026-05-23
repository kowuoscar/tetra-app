package com.tetramobile.tetra.settings;

import com.tetramobile.tetra.settings.dto.ReplaceSystemSettingsRequest;
import com.tetramobile.tetra.settings.dto.SystemSettingsResponse;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SystemSettingsController {

    private final SystemSettingsService settingsService;

    @GetMapping
    public ResponseEntity<SystemSettingsResponse> getSettings() {
        SecurityUtils.requireAdmin();
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @PutMapping
    public ResponseEntity<SystemSettingsResponse> replaceSettings(
            @Valid @RequestBody ReplaceSystemSettingsRequest request) {
        SecurityUtils.requireAdmin();
        return ResponseEntity.ok(settingsService.replaceSettings(request));
    }
}
