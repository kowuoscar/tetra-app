package com.tetramobile.tetra.dashboard;

import com.tetramobile.tetra.dashboard.dto.DashboardStatsResponse;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> stats() {
        SecurityUtils.requireAdminOrCompany();
        return ResponseEntity.ok(dashboardService.getStats());
    }
}
