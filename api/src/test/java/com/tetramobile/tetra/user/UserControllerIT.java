package com.tetramobile.tetra.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tetramobile.tetra.shared.security.JwtTokenProvider;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import jakarta.servlet.http.Cookie;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class UserControllerIT {

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

    private String adminToken;
    private UUID adminId;

    @BeforeEach
    void setUp() {
        userRepository.findByEmailIgnoreCase("admin@tetramobile.ae").ifPresent(admin -> {
            admin.setPasswordHash(passwordEncoder.encode("Admin1234!"));
            userRepository.save(admin);
            adminId = admin.getId();
            adminToken = jwtTokenProvider.generateAccessToken(admin.getId(), UserRole.admin, null);
        });
    }

    @Test
    void listUsers_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listUsers_withCustomerJwt_returns403() throws Exception {
        UUID fakeCustomerId = UUID.randomUUID();
        String customerToken = jwtTokenProvider.generateAccessToken(
                UUID.randomUUID(), UserRole.customer, fakeCustomerId);
        mockMvc.perform(get("/api/v1/users")
                        .cookie(new Cookie("access_token", customerToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    void listUsers_withAdminJwt_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/users")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").isNumber());
    }

    @Test
    void createUser_companyUser_returns201() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "company.test@example.com",
                                "name", "Test Company",
                                "password", "Password1!",
                                "role", "company"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("company.test@example.com"))
                .andExpect(jsonPath("$.role").value("company"));
    }

    @Test
    void createUser_duplicateEmail_returns409() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "admin@tetramobile.ae",
                                "name", "Dup",
                                "password", "Password1!",
                                "role", "company"
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("email_already_in_use"));
    }

    @Test
    void createUser_customerRoleWithoutCustomerId_returns422() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "cust@example.com",
                                "name", "Customer",
                                "password", "Password1!",
                                "role", "customer"
                        ))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("customer_id_required"));
    }

    @Test
    void deactivateSelf_returns422() throws Exception {
        mockMvc.perform(delete("/api/v1/users/" + adminId)
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("cannot_deactivate_self"));
    }

    @Test
    void updateUser_name_returns200() throws Exception {
        // Create a user to update
        String createResponse = mockMvc.perform(post("/api/v1/users")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "update.test@example.com",
                                "name", "Original Name",
                                "password", "Password1!",
                                "role", "company"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String userId = objectMapper.readTree(createResponse).get("id").asText();

        mockMvc.perform(patch("/api/v1/users/" + userId)
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Updated Name"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"));
    }
}
