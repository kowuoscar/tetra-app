package com.tetramobile.tetra.auth.dto;

import com.tetramobile.tetra.user.dto.UserSummaryResponse;

public record LoginResponse(UserSummaryResponse user) {
}
