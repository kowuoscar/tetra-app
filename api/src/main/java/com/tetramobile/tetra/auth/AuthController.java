package com.tetramobile.tetra.auth;

import com.tetramobile.tetra.auth.dto.LoginRequest;
import com.tetramobile.tetra.auth.dto.LoginResponse;
import com.tetramobile.tetra.shared.exception.UnauthorizedException;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        return ResponseEntity.ok(authService.login(request.email(), request.password(), response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {
        if (refreshToken == null)
            throw new UnauthorizedException("invalid_refresh_token", "Refresh token missing");
        return ResponseEntity.ok(authService.refresh(refreshToken, response));
    }

    @DeleteMapping("/session")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {
        AuthenticatedUser current = SecurityUtils.currentUser();
        authService.logout(current.userId(), refreshToken, response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<LoginResponse> me() {
        AuthenticatedUser current = SecurityUtils.currentUser();
        return ResponseEntity.ok(new LoginResponse(authService.me(current.userId())));
    }
}
