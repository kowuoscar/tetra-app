package com.tetramobile.tetra.customer;

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

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CostBreakdownIT {

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

    @BeforeEach
    void setUp() {
        adminToken = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.admin, null);
    }

    private UUID createCustomer() throws Exception {
        String body = mockMvc.perform(post("/api/v1/customers")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Cost Test Customer",
                                "contact_info", "cost@example.com",
                                "whatsapp_group_id", "wg-cost-test"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    private UUID createSimCard(UUID customerId, String type, double baseFee) throws Exception {
        String body = mockMvc.perform(post("/api/v1/customers/" + customerId + "/sim-cards")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "type", type,
                                "base_monthly_fee", baseFee
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    @Test
    void costBreakdown_missingPeriodParams_returns422() throws Exception {
        UUID customerId = createCustomer();

        mockMvc.perform(get("/api/v1/customers/" + customerId + "/cost-breakdown")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("missing_period"));
    }

    @Test
    void costBreakdown_missingMonthOnly_returns422() throws Exception {
        UUID customerId = createCustomer();

        mockMvc.perform(get("/api/v1/customers/" + customerId + "/cost-breakdown")
                        .param("year", "2026")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("missing_period"));
    }

    @Test
    void costBreakdown_unknownCustomer_returns404() throws Exception {
        UUID unknownId = UUID.randomUUID();

        mockMvc.perform(get("/api/v1/customers/" + unknownId + "/cost-breakdown")
                        .param("month", "5")
                        .param("year", "2026")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void costBreakdown_twoSimsBaseFeesOnly_isActualFalse() throws Exception {
        UUID customerId = createCustomer();
        createSimCard(customerId, "postpaid", 50.0);
        createSimCard(customerId, "prepaid", 30.0);

        String responseJson = mockMvc.perform(
                        get("/api/v1/customers/" + customerId + "/cost-breakdown")
                                .param("month", "5")
                                .param("year", "2026")
                                .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.period_month").value(5))
                .andExpect(jsonPath("$.period_year").value(2026))
                .andExpect(jsonPath("$.sim_fees").isArray())
                .andExpect(jsonPath("$.request_fees").isArray())
                .andReturn().getResponse().getContentAsString();

        JsonNode body = objectMapper.readTree(responseJson);
        assertThat(body.get("sim_fees").size()).isEqualTo(2);

        // Both should have is_actual = false
        for (JsonNode fee : body.get("sim_fees")) {
            assertThat(fee.get("is_actual").asBoolean()).isFalse();
        }

        BigDecimal total = new BigDecimal(body.get("total").asText());
        assertThat(total).isEqualByComparingTo(new BigDecimal("80.00"));
    }

    @Test
    void costBreakdown_afterActualBillingUpsert_isActualTrue() throws Exception {
        UUID customerId = createCustomer();
        UUID postpaidSimId = createSimCard(customerId, "postpaid", 50.0);
        createSimCard(customerId, "prepaid", 30.0);

        // Upsert actual billing for postpaid SIM: actual_amount = 45
        mockMvc.perform(put("/api/v1/sim-cards/" + postpaidSimId + "/monthly-billing")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "period_month", 5,
                                "period_year", 2026,
                                "actual_amount", 45.0
                        ))))
                .andExpect(status().isOk());

        String responseJson = mockMvc.perform(
                        get("/api/v1/customers/" + customerId + "/cost-breakdown")
                                .param("month", "5")
                                .param("year", "2026")
                                .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode body = objectMapper.readTree(responseJson);
        assertThat(body.get("sim_fees").size()).isEqualTo(2);

        // Find the postpaid SIM fee
        boolean foundActual = false;
        for (JsonNode fee : body.get("sim_fees")) {
            if (fee.get("sim_card_id").asText().equals(postpaidSimId.toString())) {
                assertThat(fee.get("is_actual").asBoolean()).isTrue();
                assertThat(new BigDecimal(fee.get("amount").asText()))
                        .isEqualByComparingTo(new BigDecimal("45.00"));
                foundActual = true;
            } else {
                assertThat(fee.get("is_actual").asBoolean()).isFalse();
                assertThat(new BigDecimal(fee.get("amount").asText()))
                        .isEqualByComparingTo(new BigDecimal("30.00"));
            }
        }
        assertThat(foundActual).isTrue();

        BigDecimal total = new BigDecimal(body.get("total").asText());
        assertThat(total).isEqualByComparingTo(new BigDecimal("75.00"));
    }

    @Test
    void costBreakdown_customerRole_ownCustomer_returns200() throws Exception {
        UUID customerId = createCustomer();
        String customerToken = jwtTokenProvider.generateAccessToken(
                UUID.randomUUID(), UserRole.customer, customerId);

        mockMvc.perform(get("/api/v1/customers/" + customerId + "/cost-breakdown")
                        .param("month", "5")
                        .param("year", "2026")
                        .cookie(new Cookie("access_token", customerToken)))
                .andExpect(status().isOk());
    }

    @Test
    void costBreakdown_customerRole_differentCustomer_returns403() throws Exception {
        UUID customerId = createCustomer();
        // Token for a different customer
        String differentCustomerToken = jwtTokenProvider.generateAccessToken(
                UUID.randomUUID(), UserRole.customer, UUID.randomUUID());

        mockMvc.perform(get("/api/v1/customers/" + customerId + "/cost-breakdown")
                        .param("month", "5")
                        .param("year", "2026")
                        .cookie(new Cookie("access_token", differentCustomerToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    void costBreakdown_cancelledSimsExcluded() throws Exception {
        UUID customerId = createCustomer();
        UUID cancelledSimId = createSimCard(customerId, "postpaid", 50.0);
        createSimCard(customerId, "prepaid", 30.0); // active

        // Cancel the postpaid SIM
        mockMvc.perform(patch("/api/v1/sim-cards/" + cancelledSimId)
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "cancelled"))))
                .andExpect(status().isOk());

        String responseJson = mockMvc.perform(
                        get("/api/v1/customers/" + customerId + "/cost-breakdown")
                                .param("month", "5")
                                .param("year", "2026")
                                .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode body = objectMapper.readTree(responseJson);
        // Only 1 non-cancelled SIM should appear
        assertThat(body.get("sim_fees").size()).isEqualTo(1);

        BigDecimal total = new BigDecimal(body.get("total").asText());
        assertThat(total).isEqualByComparingTo(new BigDecimal("30.00"));
    }
}
