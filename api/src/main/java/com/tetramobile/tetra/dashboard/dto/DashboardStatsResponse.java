package com.tetramobile.tetra.dashboard.dto;

public record DashboardStatsResponse(
        long totalCustomers,
        long totalPhones,
        long totalSimCards,
        long openRequests
) {}
