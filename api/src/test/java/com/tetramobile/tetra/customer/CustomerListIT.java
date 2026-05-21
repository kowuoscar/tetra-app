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

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CustomerListIT {

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
    private String customerToken;

    @BeforeEach
    void setUp() {
        adminToken    = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.admin, null);
        companyToken  = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.company, null);
        customerToken = jwtTokenProvider.generateAccessToken(UUID.randomUUID(), UserRole.customer, UUID.randomUUID());
    }

    private UUID createCustomer(String name) throws Exception {
        String body = mockMvc.perform(post("/api/v1/customers")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", name,
                                "contact_info", "contact@example.com",
                                "whatsapp_group_id", "whatsapp-group-123"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    private void createPhone(UUID customerId, String model) throws Exception {
        mockMvc.perform(post("/api/v1/customers/" + customerId + "/phones")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "model", model,
                                "ownership", "customer"
                        ))))
                .andExpect(status().isCreated());
    }

    private UUID createSimCard(UUID customerId, String type, double baseFee) throws Exception {
        String body = mockMvc.perform(post("/api/v1/customers/" + customerId + "/sim-cards")
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "type", type,
                                "base_monthly_fee", baseFee,
                                "provider", "BOUYGUES",
                                "number", "0687654321"
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    @Test
    void listCustomers_asAdmin_returnsAllCustomers() throws Exception {
        UUID c1Id = createCustomer("ListTest Alpha Corp");
        UUID c2Id = createCustomer("ListTest Beta LLC");
        UUID c3Id = createCustomer("ListTest Gamma Ltd");

        // Add 2 active phones and 1 SIM to customer c1
        createPhone(c1Id, "iPhone 14");
        createPhone(c1Id, "Samsung S24");
        createSimCard(c1Id, "postpaid", 100.0);

        // GET /customers should return at least these 3
        String listJson = mockMvc.perform(get("/api/v1/customers")
                        .param("search", "ListTest")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_elements").value(3))
                .andExpect(jsonPath("$.content").isArray())
                .andReturn().getResponse().getContentAsString();

        // Find Alpha Corp and verify counts
        JsonNode content = objectMapper.readTree(listJson).get("content");
        JsonNode alphaCorp = null;
        for (JsonNode customer : content) {
            if ("ListTest Alpha Corp".equals(customer.get("name").asText())) {
                alphaCorp = customer;
                break;
            }
        }
        assertThat(alphaCorp).isNotNull();
        assertThat(alphaCorp.get("phone_count").asInt()).isEqualTo(2);
        assertThat(alphaCorp.get("sim_card_count").asInt()).isEqualTo(1);
    }

    @Test
    void listCustomers_search_filtersByNameCaseInsensitively() throws Exception {
        createCustomer("SearchTargetListIT Alpha");
        createCustomer("SearchTargetListIT Beta");
        createCustomer("SearchTargetListIT Unrelated Corp");

        // Case-insensitive search
        mockMvc.perform(get("/api/v1/customers")
                        .param("search", "searchtargetlistit alpha")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_elements").value(1));
    }

    @Test
    void listCustomers_asCompany_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/customers")
                        .cookie(new Cookie("access_token", companyToken)))
                .andExpect(status().isOk());
    }

    @Test
    void listCustomers_asCustomer_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/customers")
                        .cookie(new Cookie("access_token", customerToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    void listCustomers_simCardCount_excludesCancelled() throws Exception {
        UUID customerId = createCustomer("SimCountTest Corp");

        UUID activeSimId   = createSimCard(customerId, "postpaid", 75.0);
        UUID cancelledSimId = createSimCard(customerId, "prepaid", 30.0);

        // Cancel the prepaid SIM
        mockMvc.perform(patch("/api/v1/sim-cards/" + cancelledSimId)
                        .cookie(new Cookie("access_token", adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "cancelled"))))
                .andExpect(status().isOk());

        String listJson = mockMvc.perform(get("/api/v1/customers")
                        .param("search", "SimCountTest Corp")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_elements").value(1))
                .andReturn().getResponse().getContentAsString();

        JsonNode customer = objectMapper.readTree(listJson).get("content").get(0);
        assertThat(customer.get("sim_card_count").asInt()).isEqualTo(1);
    }

    @Test
    void dashboardStats_returnsLiveCounts() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/stats")
                        .cookie(new Cookie("access_token", adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_customers").isNumber())
                .andExpect(jsonPath("$.total_phones").isNumber())
                .andExpect(jsonPath("$.total_sim_cards").isNumber())
                .andExpect(jsonPath("$.open_requests").isNumber());
    }

    @Test
    void dashboardStats_asCompany_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/stats")
                        .cookie(new Cookie("access_token", companyToken)))
                .andExpect(status().isOk());
    }

    @Test
    void dashboardStats_asCustomer_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/stats")
                        .cookie(new Cookie("access_token", customerToken)))
                .andExpect(status().isForbidden());
    }
}
