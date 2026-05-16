package com.tetramobile.tetra.auth;

import com.tetramobile.tetra.auth.model.RefreshToken;
import com.tetramobile.tetra.user.UserRepository;
import com.tetramobile.tetra.user.model.User;
import com.tetramobile.tetra.user.model.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Testcontainers
class RefreshTokenRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("tetra")
            .withUsername("tetra")
            .withPassword("tetra");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    private UUID userId;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setEmail("rt-test-" + UUID.randomUUID() + "@example.com");
        user.setPasswordHash("hashed");
        user.setName("RT Test User");
        user.setRole(UserRole.customer);
        userId = userRepository.save(user).getId();
    }

    @Test
    void findByTokenHashAndExpiresAtAfter_returnsValidToken() {
        RefreshToken token = new RefreshToken();
        token.setUserId(userId);
        token.setTokenHash("valid-hash-" + UUID.randomUUID());
        token.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        refreshTokenRepository.save(token);

        Optional<RefreshToken> found = refreshTokenRepository
                .findByTokenHashAndExpiresAtAfter(token.getTokenHash(), Instant.now());
        assertThat(found).isPresent();
    }

    @Test
    void findByTokenHashAndExpiresAtAfter_doesNotReturnExpiredToken() {
        RefreshToken expired = new RefreshToken();
        expired.setUserId(userId);
        expired.setTokenHash("expired-hash-" + UUID.randomUUID());
        expired.setExpiresAt(Instant.now().minus(1, ChronoUnit.SECONDS));
        refreshTokenRepository.save(expired);

        Optional<RefreshToken> found = refreshTokenRepository
                .findByTokenHashAndExpiresAtAfter(expired.getTokenHash(), Instant.now());
        assertThat(found).isEmpty();
    }
}
