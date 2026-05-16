package com.tetramobile.tetra.auth;

import com.tetramobile.tetra.auth.dto.LoginResponse;
import com.tetramobile.tetra.auth.model.RefreshToken;
import com.tetramobile.tetra.shared.exception.ForbiddenException;
import com.tetramobile.tetra.shared.exception.NotFoundException;
import com.tetramobile.tetra.shared.exception.UnauthorizedException;
import com.tetramobile.tetra.shared.security.JwtTokenProvider;
import com.tetramobile.tetra.user.UserRepository;
import com.tetramobile.tetra.user.dto.UserSummaryResponse;
import com.tetramobile.tetra.user.model.User;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtProvider;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public LoginResponse login(String email, String password, HttpServletResponse response) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UnauthorizedException("invalid_credentials", "Invalid credentials"));
        if (!passwordEncoder.matches(password, user.getPasswordHash()))
            throw new UnauthorizedException("invalid_credentials", "Invalid credentials");
        if (!user.isActive())
            throw new ForbiddenException("account_deactivated", "Account is deactivated");

        String accessToken = jwtProvider.generateAccessToken(user.getId(), user.getRole(), user.getCustomerId());
        String rawRefreshToken = UUID.randomUUID().toString();

        RefreshToken rt = new RefreshToken();
        rt.setUserId(user.getId());
        rt.setTokenHash(sha256(rawRefreshToken));
        rt.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        refreshTokenRepository.save(rt);

        setAccessTokenCookie(response, accessToken);
        setRefreshTokenCookie(response, rawRefreshToken);

        return new LoginResponse(UserSummaryResponse.from(user));
    }

    @Override
    @Transactional
    public LoginResponse refresh(String rawRefreshToken, HttpServletResponse response) {
        String hash = sha256(rawRefreshToken);
        RefreshToken rt = refreshTokenRepository.findByTokenHashAndExpiresAtAfter(hash, Instant.now())
                .orElseThrow(() -> new UnauthorizedException("invalid_refresh_token",
                        "Refresh token is invalid or expired"));

        User user = userRepository.findById(rt.getUserId())
                .orElseThrow(() -> new UnauthorizedException("invalid_refresh_token", "User not found"));

        refreshTokenRepository.deleteByTokenHash(hash);

        String newRaw = UUID.randomUUID().toString();
        RefreshToken newRt = new RefreshToken();
        newRt.setUserId(user.getId());
        newRt.setTokenHash(sha256(newRaw));
        newRt.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        refreshTokenRepository.save(newRt);

        String newAccessToken = jwtProvider.generateAccessToken(user.getId(), user.getRole(), user.getCustomerId());
        setAccessTokenCookie(response, newAccessToken);
        setRefreshTokenCookie(response, newRaw);

        return new LoginResponse(UserSummaryResponse.from(user));
    }

    @Override
    @Transactional
    public void logout(UUID userId, String rawRefreshToken, HttpServletResponse response) {
        if (rawRefreshToken != null) {
            refreshTokenRepository.deleteByTokenHash(sha256(rawRefreshToken));
        }
        refreshTokenRepository.deleteByUserId(userId);
        clearAuthCookies(response);
    }

    @Override
    public UserSummaryResponse me(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return UserSummaryResponse.from(user);
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private void setAccessTokenCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("access_token", token)
                .httpOnly(true).secure(true).sameSite("Strict")
                .path("/").maxAge(900).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", token)
                .httpOnly(true).secure(true).sameSite("Strict")
                .path("/api/v1/auth/refresh").maxAge(604800).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearAuthCookies(HttpServletResponse response) {
        ResponseCookie ac = ResponseCookie.from("access_token", "")
                .httpOnly(true).secure(true).sameSite("Strict").path("/").maxAge(0).build();
        ResponseCookie rc = ResponseCookie.from("refresh_token", "")
                .httpOnly(true).secure(true).sameSite("Strict").path("/api/v1/auth/refresh").maxAge(0).build();
        response.addHeader(HttpHeaders.SET_COOKIE, ac.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, rc.toString());
    }
}
