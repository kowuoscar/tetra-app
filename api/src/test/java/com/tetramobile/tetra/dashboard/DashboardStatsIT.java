package com.tetramobile.tetra.dashboard;

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
import org.springframework.test.annotation.DirtiesContext;
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
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class DashboardStatsIT {

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

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JwtTokenProvider jwtTokenProvider;

    private String adminToken;

    @BeforeEach
    void setUp() {
        adminToken = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.admin, null);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private JsonNode getStats() throws Exception {
        String json = mockMvc.perform(get("/api/v1/dashboard/stats")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json);
    }

    private UUID createCustomer(String name) throws Exception {
        String body = mockMvc.perform(post("/api/v1/customers")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", name,
                                "contact_info", "contact@example.com",
                                "whatsapp_group_id", "group-123"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    private UUID createPhone(UUID customerId) throws Exception {
        String body = mockMvc.perform(post("/api/v1/customers/" + customerId + "/phones")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "model", "Test Phone",
                                "ownership", "customer"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    private UUID createSimCard(UUID customerId) throws Exception {
        String body = mockMvc.perform(post("/api/v1/customers/" + customerId + "/sim-cards")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "type", "postpaid",
                                "base_monthly_fee", 50.0,
                                "provider", "BOUYGUES",
                                "number", "06" + System.nanoTime() % 100000000L
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    private void patchPhone(UUID phoneId, String status) throws Exception {
        mockMvc.perform(patch("/api/v1/phones/" + phoneId)
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", status))))
                .andExpect(status().isOk());
    }

    private UUID createRequest(UUID customerId) throws Exception {
        String body = mockMvc.perform(post("/api/v1/requests")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "customer_id", customerId.toString(),
                                "type", "manual_support"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    private void patchRequest(UUID requestId, String status) throws Exception {
        mockMvc.perform(patch("/api/v1/requests/" + requestId)
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", status))))
                .andExpect(status().isOk());
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    void newCustomersThisMonth_incrementsWhenCustomerCreated() throws Exception {
        long before = getStats().get("new_customers_this_month").asLong();

        createCustomer("DashboardIT NewCustomer " + UUID.randomUUID());

        long after = getStats().get("new_customers_this_month").asLong();
        org.assertj.core.api.Assertions.assertThat(after).isEqualTo(before + 1);
    }

    @Test
    void phonesInRepair_incrementsWhenPhonePatchedToInRepair() throws Exception {
        UUID customerId = createCustomer("DashboardIT RepairTest " + UUID.randomUUID());
        UUID phoneId    = createPhone(customerId);

        long before = getStats().get("phones_in_repair").asLong();
        patchPhone(phoneId, "in_repair");
        long after  = getStats().get("phones_in_repair").asLong();

        org.assertj.core.api.Assertions.assertThat(after).isEqualTo(before + 1);
    }

    @Test
    void unassignedSimCards_incrementsWhenSimCreatedWithoutPhone() throws Exception {
        UUID customerId = createCustomer("DashboardIT UnassignedSim " + UUID.randomUUID());

        long before = getStats().get("unassigned_sim_cards").asLong();
        createSimCard(customerId);
        long after  = getStats().get("unassigned_sim_cards").asLong();

        org.assertj.core.api.Assertions.assertThat(after).isEqualTo(before + 1);
    }

    @Test
    void phonesWithoutSim_incrementsWhenActivePhoneHasNoSim() throws Exception {
        UUID customerId = createCustomer("DashboardIT PhoneNoSim " + UUID.randomUUID());

        long before = getStats().get("phones_without_sim").asLong();
        createPhone(customerId);
        long after  = getStats().get("phones_without_sim").asLong();

        org.assertj.core.api.Assertions.assertThat(after).isEqualTo(before + 1);
    }

    @Test
    void requestStatusCounts_splitByStatus() throws Exception {
        UUID customerId = createCustomer("DashboardIT RequestStatus " + UUID.randomUUID());

        long beforeSubmitted   = getStats().get("submitted_requests").asLong();
        long beforeInProgress  = getStats().get("in_progress_requests").asLong();

        UUID req1 = createRequest(customerId); // submitted
        UUID req2 = createRequest(customerId); // will advance to in_progress
        patchRequest(req2, "in_progress");

        long afterSubmitted   = getStats().get("submitted_requests").asLong();
        long afterInProgress  = getStats().get("in_progress_requests").asLong();

        org.assertj.core.api.Assertions.assertThat(afterSubmitted)
                .as("submitted_requests should include the new submitted request")
                .isEqualTo(beforeSubmitted + 1);
        org.assertj.core.api.Assertions.assertThat(afterInProgress)
                .as("in_progress_requests should include the advanced request")
                .isEqualTo(beforeInProgress + 1);
    }

    @Test
    void submittedAndInProgress_sumEqualsOpenRequests() throws Exception {
        JsonNode stats = getStats();
        long submitted   = stats.get("submitted_requests").asLong();
        long inProgress  = stats.get("in_progress_requests").asLong();
        long open        = stats.get("open_requests").asLong();

        org.assertj.core.api.Assertions.assertThat(submitted + inProgress).isEqualTo(open);
    }
}
