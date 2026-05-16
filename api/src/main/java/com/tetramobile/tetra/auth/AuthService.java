package com.tetramobile.tetra.auth;

import com.tetramobile.tetra.auth.dto.LoginResponse;
import com.tetramobile.tetra.user.dto.UserSummaryResponse;
import jakarta.servlet.http.HttpServletResponse;

import java.util.UUID;

public interface AuthService {

    LoginResponse login(String email, String password, HttpServletResponse response);

    LoginResponse refresh(String refreshTokenValue, HttpServletResponse response);

    void logout(UUID userId, String refreshTokenValue, HttpServletResponse response);

    UserSummaryResponse me(UUID userId);
}
