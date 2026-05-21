package com.tetramobile.tetra.customer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tetramobile.tetra.shared.security.JwtTokenProvider;
import com.tetramobile.tetra.user.model.UserRole;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class CustomerControllerIT {

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

    private String adminToken;
    private String companyToken;

    @BeforeEach
    void setUp() {
        adminToken = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.admin, null);
        companyToken = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.company, null);
    }

    private String createCustomer(String name) throws Exception {
        return mockMvc.perform(post("/api/v1/customers")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", name,
                                "contact_info", "contact@example.com",
                                "whatsapp_group_id", "whatsapp-group-123"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void createCustomer_asAdmin_returns201WithZeroComputedFields() throws Exception {
        mockMvc.perform(post("/api/v1/customers")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Acme Corp",
                                "contact_info", "acme@example.com",
                                "whatsapp_group_id", "group-acme-001"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isString())
                .andExpect(jsonPath("$.name").value("Acme Corp"))
                .andExpect(jsonPath("$.contact_info").value("acme@example.com"))
                .andExpect(jsonPath("$.whatsapp_group_id").value("group-acme-001"))
                .andExpect(jsonPath("$.phone_count").value(0))
                .andExpect(jsonPath("$.sim_card_count").value(0))
                .andExpect(jsonPath("$.open_request_count").value(0))
                .andExpect(jsonPath("$.current_month_cost").value(0))
                .andExpect(jsonPath("$.created_at").isString());
    }

    @Test
    void createCustomer_asCompany_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/customers")
                        .cookie(new Cookie("access_token", companyToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Should Fail",
                                "contact_info", "fail@example.com",
                                "whatsapp_group_id", "group-fail"
                        ))))
                .andExpect(status().isForbidden());
    }

    @Test
    void getCustomer_asCustomerWithOwnId_returns200() throws Exception {
        // Create the customer as admin
        String created = createCustomer("Own Customer");
        UUID customerId = UUID.fromString(objectMapper.readTree(created).get("id").asText());

        // Issue a customer-role token linked to that customer_id
        String customerToken = jwtTokenProvider.generateAccessToken(
                UUID.randomUUID(), UserRole.customer, customerId);

        mockMvc.perform(get("/api/v1/customers/" + customerId)
                        .cookie(new Cookie("access_token", customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(customerId.toString()));
    }

    @Test
    void getCustomer_asCustomerWithDifferentId_returns403() throws Exception {
        // Create a customer as admin
        String created = createCustomer("Other Customer");
        UUID otherCustomerId = UUID.fromString(objectMapper.readTree(created).get("id").asText());

        // Issue a customer token with a DIFFERENT customer_id
        UUID myCustomerId = UUID.randomUUID();
        String customerToken = jwtTokenProvider.generateAccessToken(
                UUID.randomUUID(), UserRole.customer, myCustomerId);

        mockMvc.perform(get("/api/v1/customers/" + otherCustomerId)
                        .cookie(new Cookie("access_token", customerToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("forbidden"));
    }

    @Test
    void getCustomer_unknownId_asAdmin_returns404() throws Exception {
        UUID unknownId = UUID.randomUUID();

        mockMvc.perform(get("/api/v1/customers/" + unknownId)
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateCustomer_partialUpdate_preservesUnchangedFields() throws Exception {
        String created = createCustomer("Partial Update Customer");
        UUID customerId = UUID.fromString(objectMapper.readTree(created).get("id").asText());

        // Only update name — contactInfo and whatsappGroupId should be preserved
        mockMvc.perform(patch("/api/v1/customers/" + customerId)
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Updated Name"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"))
                .andExpect(jsonPath("$.contact_info").value("contact@example.com"))
                .andExpect(jsonPath("$.whatsapp_group_id").value("whatsapp-group-123"));
    }

    @Test
    void updateCustomer_unknownId_returns404() throws Exception {
        UUID unknownId = UUID.randomUUID();

        mockMvc.perform(patch("/api/v1/customers/" + unknownId)
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Ghost"))))
                .andExpect(status().isNotFound());
    }
}
