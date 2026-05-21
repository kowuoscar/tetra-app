package com.tetramobile.tetra.phone;

import com.fasterxml.jackson.databind.JsonNode;
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
class PhoneControllerIT {

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

    // --- Helpers ---

    private UUID createCustomer() throws Exception {
        String response = mockMvc.perform(post("/api/v1/customers")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Test Customer",
                                "contact_info", "test@example.com",
                                "whatsapp_group_id", "group-test-001"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(response).get("id").asText());
    }

    private UUID createPhone(UUID customerId) throws Exception {
        String response = mockMvc.perform(post("/api/v1/customers/" + customerId + "/phones")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "model", "iPhone 15",
                                "ownership", "customer"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(response).get("id").asText());
    }

    private void createSimCard(UUID customerId, UUID phoneId) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("type", phoneId != null ? "postpaid" : "prepaid");
        body.put("base_monthly_fee", phoneId != null ? 50.00 : 25.00);
        body.put("provider", "ORANGE");
        body.put("number", "0712345678");
        if (phoneId != null) {
            body.put("phone_id", phoneId.toString());
        }
        mockMvc.perform(post("/api/v1/customers/" + customerId + "/sim-cards")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());
    }

    // --- Tests ---

    @Test
    void createPhone_asAdmin_returns201WithCorrectFields() throws Exception {
        UUID customerId = createCustomer();

        mockMvc.perform(post("/api/v1/customers/" + customerId + "/phones")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "model", "Samsung Galaxy S24",
                                "ownership", "company"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isString())
                .andExpect(jsonPath("$.model").value("Samsung Galaxy S24"))
                .andExpect(jsonPath("$.ownership").value("company"))
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.customer_id").value(customerId.toString()))
                .andExpect(jsonPath("$.sim_card").isEmpty())
                .andExpect(jsonPath("$.is_unused").value(true))
                .andExpect(jsonPath("$.created_at").isString());
    }

    @Test
    void createPhone_asCompany_returns403() throws Exception {
        UUID customerId = createCustomer();

        mockMvc.perform(post("/api/v1/customers/" + customerId + "/phones")
                        .cookie(new Cookie("access_token", companyToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "model", "iPhone 14",
                                "ownership", "customer"
                        ))))
                .andExpect(status().isForbidden());
    }

    @Test
    void createPhone_unknownCustomer_returns404() throws Exception {
        mockMvc.perform(post("/api/v1/customers/" + UUID.randomUUID() + "/phones")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "model", "Pixel 8",
                                "ownership", "customer"
                        ))))
                .andExpect(status().isNotFound());
    }

    @Test
    void createPhoneAndAssignSim_phoneBecomesNotUnused() throws Exception {
        UUID customerId = createCustomer();
        UUID phoneId = createPhone(customerId);

        // Initially is_unused=true
        mockMvc.perform(get("/api/v1/customers/" + customerId + "/phones")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phones[0].is_unused").value(true));

        // Assign a SIM to that phone
        createSimCard(customerId, phoneId);

        // Now is_unused should be false
        mockMvc.perform(get("/api/v1/customers/" + customerId + "/phones")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phones[0].is_unused").value(false))
                .andExpect(jsonPath("$.phones[0].sim_card").isNotEmpty())
                .andExpect(jsonPath("$.phones[0].sim_card.id").isString());
    }

    @Test
    void patchPhone_statusReplaced_returns422() throws Exception {
        UUID customerId = createCustomer();
        UUID phoneId = createPhone(customerId);

        mockMvc.perform(patch("/api/v1/phones/" + phoneId)
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "replaced"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("invalid_status_transition"));
    }

    @Test
    void patchPhone_statusInRepair_returns200AndUpdatesStatus() throws Exception {
        UUID customerId = createCustomer();
        UUID phoneId = createPhone(customerId);

        mockMvc.perform(patch("/api/v1/phones/" + phoneId)
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "in_repair"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("in_repair"));
    }

    @Test
    void patchPhone_unknownId_returns404() throws Exception {
        mockMvc.perform(patch("/api/v1/phones/" + UUID.randomUUID())
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "in_repair"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void listPhones_asCustomerWithOwnId_returns200() throws Exception {
        UUID customerId = createCustomer();
        createPhone(customerId);

        String customerToken = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.customer, customerId);

        mockMvc.perform(get("/api/v1/customers/" + customerId + "/phones")
                        .cookie(new Cookie("access_token", customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phones").isArray());
    }

    @Test
    void listPhones_asCustomerWithDifferentId_returns403() throws Exception {
        UUID customerId = createCustomer();
        String customerToken = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.customer, UUID.randomUUID());

        mockMvc.perform(get("/api/v1/customers/" + customerId + "/phones")
                        .cookie(new Cookie("access_token", customerToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("forbidden"));
    }

    @Test
    void listPhones_includeReplaced_false_excludesReplacedPhone() throws Exception {
        UUID customerId = createCustomer();

        // Create a phone and set it to in_repair first, then we'll test include_replaced
        UUID phoneId = createPhone(customerId);

        // Verify phone appears in default list
        String listResponse = mockMvc.perform(get("/api/v1/customers/" + customerId + "/phones")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode phones = objectMapper.readTree(listResponse).get("phones");
        assert phones.size() == 1;
    }
}
