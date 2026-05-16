package com.tetramobile.tetra.shared.security;

import com.tetramobile.tetra.user.model.UserRole;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider("test-secret-key-minimum-32-chars-long!!");
    }

    @Test
    void generateAndParseToken_admin() {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateAccessToken(userId, UserRole.admin, null);

        assertThat(token).isNotBlank();
        Claims claims = jwtTokenProvider.parseToken(token);
        assertThat(claims.getSubject()).isEqualTo(userId.toString());
        assertThat(claims.get("role", String.class)).isEqualTo("admin");
        assertThat(claims.get("customer_id", String.class)).isNull();
    }

    @Test
    void generateAndParseToken_customer_includesCustomerId() {
        UUID userId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        String token = jwtTokenProvider.generateAccessToken(userId, UserRole.customer, customerId);

        Claims claims = jwtTokenProvider.parseToken(token);
        assertThat(claims.get("role", String.class)).isEqualTo("customer");
        assertThat(claims.get("customer_id", String.class)).isEqualTo(customerId.toString());
    }

    @Test
    void isValid_validToken_returnsTrue() {
        String token = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.company, null);
        assertThat(jwtTokenProvider.isValid(token)).isTrue();
    }

    @Test
    void isValid_tamperedToken_returnsFalse() {
        String token = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.admin, null);
        String tampered = token.substring(0, token.length() - 4) + "XXXX";
        assertThat(jwtTokenProvider.isValid(tampered)).isFalse();
    }

    @Test
    void isValid_blankToken_returnsFalse() {
        assertThat(jwtTokenProvider.isValid("")).isFalse();
        assertThat(jwtTokenProvider.isValid("not.a.jwt")).isFalse();
    }
}
