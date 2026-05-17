package com.tetramobile.tetra.simcard;

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

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
class SimCardControllerIT {

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
                                "name", "SIM Test Customer",
                                "contact_info", "sim@example.com",
                                "whatsapp_group_id", "group-sim-001"
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
                                "model", "Pixel 8 Pro",
                                "ownership", "customer"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(response).get("id").asText());
    }

    private UUID createSimCard(UUID customerId, UUID phoneId, String type) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("type", type);
        body.put("base_monthly_fee", 50.00);
        if (phoneId != null) {
            body.put("phone_id", phoneId.toString());
        }
        String response = mockMvc.perform(post("/api/v1/customers/" + customerId + "/sim-cards")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(response).get("id").asText());
    }

    // --- Tests ---

    @Test
    void createSimCard_withPhoneId_statusIsActive() throws Exception {
        UUID customerId = createCustomer();
        UUID phoneId = createPhone(customerId);

        mockMvc.perform(post("/api/v1/customers/" + customerId + "/sim-cards")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "type", "postpaid",
                                "base_monthly_fee", 75.00,
                                "phone_id", phoneId.toString()
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isString())
                .andExpect(jsonPath("$.type").value("postpaid"))
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.phone_id").value(phoneId.toString()))
                .andExpect(jsonPath("$.is_unused").value(false));
    }

    @Test
    void createSimCard_withoutPhoneId_statusIsUnassignedAndIsUnused() throws Exception {
        UUID customerId = createCustomer();

        mockMvc.perform(post("/api/v1/customers/" + customerId + "/sim-cards")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "type", "prepaid",
                                "base_monthly_fee", 30.00
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("unassigned"))
                .andExpect(jsonPath("$.phone_id").isEmpty())
                .andExpect(jsonPath("$.is_unused").value(true));
    }

    @Test
    void createSimCard_asCompany_returns403() throws Exception {
        UUID customerId = createCustomer();

        mockMvc.perform(post("/api/v1/customers/" + customerId + "/sim-cards")
                        .cookie(new Cookie("access_token", companyToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "type", "prepaid",
                                "base_monthly_fee", 20.00
                        ))))
                .andExpect(status().isForbidden());
    }

    @Test
    void createSimCard_phoneAlreadyHasSim_returns422() throws Exception {
        UUID customerId = createCustomer();
        UUID phoneId = createPhone(customerId);

        // Assign first SIM to phone
        createSimCard(customerId, phoneId, "postpaid");

        // Try to assign another SIM to the same phone
        mockMvc.perform(post("/api/v1/customers/" + customerId + "/sim-cards")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "type", "prepaid",
                                "base_monthly_fee", 25.00,
                                "phone_id", phoneId.toString()
                        ))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("phone_already_has_sim"));
    }

    @Test
    void createSimCard_phoneBelongsToDifferentCustomer_returns422() throws Exception {
        UUID customer1Id = createCustomer();
        UUID customer2Id = createCustomer();
        UUID phone2Id = createPhone(customer2Id);

        // Try to assign phone from customer2 to a SIM for customer1
        mockMvc.perform(post("/api/v1/customers/" + customer1Id + "/sim-cards")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "type", "prepaid",
                                "base_monthly_fee", 25.00,
                                "phone_id", phone2Id.toString()
                        ))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("phone_belongs_to_different_customer"));
    }

    @Test
    void patchSimCard_unassignPhone_statusBecomesUnassigned() throws Exception {
        UUID customerId = createCustomer();
        UUID phoneId = createPhone(customerId);
        UUID simId = createSimCard(customerId, phoneId, "postpaid");

        // Unassign by setting phone_id to null
        Map<String, Object> patchBody = new HashMap<>();
        patchBody.put("phone_id", null);

        mockMvc.perform(patch("/api/v1/sim-cards/" + simId)
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(patchBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("unassigned"))
                .andExpect(jsonPath("$.phone_id").isEmpty())
                .andExpect(jsonPath("$.is_unused").value(true));
    }

    @Test
    void patchSimCard_assignPhone_statusBecomesActive() throws Exception {
        UUID customerId = createCustomer();
        UUID phoneId = createPhone(customerId);
        UUID simId = createSimCard(customerId, null, "prepaid");

        mockMvc.perform(patch("/api/v1/sim-cards/" + simId)
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("phone_id", phoneId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.phone_id").value(phoneId.toString()))
                .andExpect(jsonPath("$.is_unused").value(false));
    }

    @Test
    void monthlyBilling_onPrepaidSim_returns422() throws Exception {
        UUID customerId = createCustomer();
        UUID simId = createSimCard(customerId, null, "prepaid");

        mockMvc.perform(put("/api/v1/sim-cards/" + simId + "/monthly-billing")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "period_month", 5,
                                "period_year", 2026,
                                "actual_amount", 45.00
                        ))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("sim_card_not_postpaid"));
    }

    @Test
    void monthlyBilling_onPostpaidSim_returns200AndIsIdempotent() throws Exception {
        UUID customerId = createCustomer();
        UUID simId = createSimCard(customerId, null, "postpaid");

        // First PUT
        mockMvc.perform(put("/api/v1/sim-cards/" + simId + "/monthly-billing")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "period_month", 5,
                                "period_year", 2026,
                                "actual_amount", 100.00
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sim_card_id").value(simId.toString()))
                .andExpect(jsonPath("$.period_month").value(5))
                .andExpect(jsonPath("$.period_year").value(2026))
                .andExpect(jsonPath("$.actual_amount").value(100.00));

        // Second PUT for same period — should replace value
        mockMvc.perform(put("/api/v1/sim-cards/" + simId + "/monthly-billing")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "period_month", 5,
                                "period_year", 2026,
                                "actual_amount", 120.50
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actual_amount").value(120.50));
    }

    @Test
    void monthlyBilling_onPostpaidSim_unknownSim_returns404() throws Exception {
        mockMvc.perform(put("/api/v1/sim-cards/" + UUID.randomUUID() + "/monthly-billing")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "period_month", 5,
                                "period_year", 2026,
                                "actual_amount", 50.00
                        ))))
                .andExpect(status().isNotFound());
    }

    @Test
    void listSimCards_asCustomerWithDifferentId_returns403() throws Exception {
        UUID customerId = createCustomer();
        String customerToken = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.customer, UUID.randomUUID());

        mockMvc.perform(get("/api/v1/customers/" + customerId + "/sim-cards")
                        .cookie(new Cookie("access_token", customerToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("forbidden"));
    }

    @Test
    void listSimCards_asCustomerWithOwnId_returns200() throws Exception {
        UUID customerId = createCustomer();
        createSimCard(customerId, null, "prepaid");

        String customerToken = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.customer, customerId);

        mockMvc.perform(get("/api/v1/customers/" + customerId + "/sim-cards")
                        .cookie(new Cookie("access_token", customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sim_cards").isArray());
    }
}
