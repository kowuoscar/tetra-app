package com.tetramobile.tetra.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tetramobile.tetra.shared.security.JwtTokenProvider;
import com.tetramobile.tetra.user.UserRepository;
import com.tetramobile.tetra.user.model.User;
import com.tetramobile.tetra.user.model.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import jakarta.servlet.http.Cookie;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class AuthControllerIT {

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
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void resetAdminPassword() {
        userRepository.findByEmailIgnoreCase("admin@tetramobile.ae").ifPresent(admin -> {
            admin.setPasswordHash(passwordEncoder.encode("Admin1234!"));
            userRepository.save(admin);
        });
    }

    @Test
    void login_validCredentials_returns200WithCookies() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", "admin@tetramobile.ae", "password", "Admin1234!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("admin@tetramobile.ae"))
                .andReturn();

        String setCookie = result.getResponse().getHeader("Set-Cookie");
        assertThat(setCookie).contains("access_token");
        String allCookies = String.join("; ", result.getResponse().getHeaders("Set-Cookie"));
        assertThat(allCookies).contains("refresh_token");
    }

    @Test
    void login_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", "admin@tetramobile.ae", "password", "WrongPass!"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("invalid_credentials"));
    }

    @Test
    void login_unknownEmail_returns401SameCode() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", "nobody@example.com", "password", "Whatever1!"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("invalid_credentials"));
    }

    @Test
    void logout_withoutToken_returns401() throws Exception {
        mockMvc.perform(delete("/api/v1/auth/session"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_withValidToken_returns204AndClearsCoookies() throws Exception {
        User admin = userRepository.findByEmailIgnoreCase("admin@tetramobile.ae").orElseThrow();
        String accessToken = jwtTokenProvider.generateAccessToken(
                admin.getId(), UserRole.admin, null);

        MvcResult result = mockMvc.perform(delete("/api/v1/auth/session")
                        .cookie(new Cookie("access_token", accessToken)))
                .andExpect(status().isNoContent())
                .andReturn();

        String allCookies = String.join("; ", result.getResponse().getHeaders("Set-Cookie"));
        assertThat(allCookies).contains("Max-Age=0");
    }

    @Test
    void me_withValidToken_returnsUser() throws Exception {
        User admin = userRepository.findByEmailIgnoreCase("admin@tetramobile.ae").orElseThrow();
        String accessToken = jwtTokenProvider.generateAccessToken(
                admin.getId(), UserRole.admin, null);

        mockMvc.perform(get("/api/v1/auth/me")
                        .cookie(new Cookie("access_token", accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("admin@tetramobile.ae"))
                .andExpect(jsonPath("$.user.role").value("admin"));
    }

    @Test
    void refresh_withValidCookie_returns200WithNewCookies() throws Exception {
        // First login to get a refresh token
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", "admin@tetramobile.ae", "password", "Admin1234!"))))
                .andExpect(status().isOk())
                .andReturn();

        String refreshTokenValue = loginResult.getResponse().getCookies() != null
                ? java.util.Arrays.stream(loginResult.getResponse().getCookies())
                        .filter(c -> "refresh_token".equals(c.getName()))
                        .map(Cookie::getValue)
                        .findFirst().orElse(null)
                : null;

        // Extract from Set-Cookie header if not in cookie array
        if (refreshTokenValue == null) {
            String setCookieHeaders = String.join("\n", loginResult.getResponse().getHeaders("Set-Cookie"));
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("refresh_token=([^;]+)").matcher(setCookieHeaders);
            if (m.find()) refreshTokenValue = m.group(1);
        }

        assertThat(refreshTokenValue).isNotNull();

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie("refresh_token", refreshTokenValue)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("admin@tetramobile.ae"))
                .andReturn();

        String allCookies = String.join("; ", refreshResult.getResponse().getHeaders("Set-Cookie"));
        assertThat(allCookies).contains("access_token");
        assertThat(allCookies).contains("refresh_token");
    }
}
