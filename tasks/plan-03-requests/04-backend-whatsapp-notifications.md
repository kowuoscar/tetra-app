# Backend — WhatsApp Notifications + MonthlyCostSummaryJob

## Domain

backend

## Plan

`plans/plan-03-requests.md`

## Depends on

- `tasks/plan-03-requests/02-backend-request-service.md` — RequestCreatedEvent, RequestStatusChangedEvent published

## References

- `specs/backend.md#whatsapp-rules` — fire-and-forget, WARN on failure, does not rollback
- `specs/backend.md#monthly-cost-summary-job`
- `docs/architecture.md` — WhatsApp Business API send-only client

## Context

`WhatsAppService` is a thin HTTP client that POSTs to WhatsApp Business API. Event listeners on `RequestCreatedEvent` and `RequestStatusChangedEvent` call it in a new transaction (AFTER_COMMIT). `MonthlyCostSummaryJob` fires cron `0 8 1 * *` and sends per-customer cost summaries. All dispatch calls log at INFO; failure logs at WARN and does not propagate.

---

### Inlined spec excerpts

**WhatsApp API:**
```
Endpoint: POST https://graph.facebook.com/v19.0/{phone_number_id}/messages
Auth: Bearer {WHATSAPP_API_TOKEN}
Body: { messaging_product: "whatsapp", to: "{group_id}", type: "text", text: { body: "..." } }
Config: whatsapp.phone-number-id, whatsapp.api-token (empty string = disabled)
```

**Messages fired:**
- On RequestCreatedEvent: "New request submitted: {type} — {description truncated to 100 chars}"
- On RequestStatusChangedEvent: "Request update: {type} status changed to {newStatus}"
- MonthlyCostSummaryJob: "Monthly summary for {customerName}: {N} phones, {M} SIM cards, total €{cost}"

**Behaviour when token missing/empty:** log INFO "WhatsApp not configured, skipping", return immediately.

**MonthlyCostSummaryJob schedule:** cron `0 8 1 * *` — 1st of month, 08:00 UTC

---

## Implementation

### 1. WhatsAppProperties

`com.tetramobile.tetra.whatsapp.WhatsAppProperties`:
```java
@ConfigurationProperties(prefix = "whatsapp")
public record WhatsAppProperties(
    String phoneNumberId,
    String apiToken
) {
    public boolean isConfigured() {
        return apiToken != null && !apiToken.isBlank();
    }
}
```

Enable: `@EnableConfigurationProperties(WhatsAppProperties.class)`.

`application.yml`:
```yaml
whatsapp:
  phone-number-id: ${WHATSAPP_PHONE_NUMBER_ID:}
  api-token: ${WHATSAPP_API_TOKEN:}
```

### 2. WhatsAppService

`com.tetramobile.tetra.whatsapp.WhatsAppService`:
```java
public interface WhatsAppService {
    void sendText(String groupId, String message);
}
```

`com.tetramobile.tetra.whatsapp.WhatsAppServiceImpl`:
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppServiceImpl implements WhatsAppService {

    private final WhatsAppProperties props;
    private final RestClient restClient;

    @Override
    public void sendText(String groupId, String message) {
        if (!props.isConfigured()) {
            log.info("WhatsApp not configured, skipping dispatch to group={}", groupId);
            return;
        }
        log.info("WhatsApp dispatch: group={} message={}", groupId,
            message.length() > 80 ? message.substring(0, 80) + "…" : message);
        try {
            restClient.post()
                .uri("https://graph.facebook.com/v19.0/{phoneNumberId}/messages",
                    props.phoneNumberId())
                .header("Authorization", "Bearer " + props.apiToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                    "messaging_product", "whatsapp",
                    "to", groupId,
                    "type", "text",
                    "text", Map.of("body", message)
                ))
                .retrieve()
                .toBodilessEntity();
        } catch (Exception e) {
            log.warn("WhatsApp dispatch failed: group={} error={}", groupId, e.getMessage());
        }
    }
}
```

`RestClient` bean — add to a `WebConfig` or `AppConfig`:
```java
@Bean
public RestClient restClient() {
    return RestClient.create();
}
```

### 3. Event listeners

`com.tetramobile.tetra.whatsapp.WhatsAppEventListener`:
```java
@Component
@RequiredArgsConstructor
@Slf4j
public class WhatsAppEventListener {

    private final WhatsAppService whatsAppService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRequestCreated(RequestCreatedEvent event) {
        String msg = "New request submitted: " + event.requestType().name().replace("_", " ");
        whatsAppService.sendText(event.customerWhatsappGroupId(), msg);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStatusChanged(RequestStatusChangedEvent event) {
        String msg = "Request update: status changed to " + event.newStatus().name();
        whatsAppService.sendText(event.customerWhatsappGroupId(), msg);
    }
}
```

### 4. MonthlyCostSummaryJob

`com.tetramobile.tetra.whatsapp.MonthlyCostSummaryJob`:
```java
@Component
@RequiredArgsConstructor
@Slf4j
public class MonthlyCostSummaryJob {

    private final CustomerRepository customerRepository;
    private final CustomerQueryRepository customerQueryRepository;
    private final WhatsAppService whatsAppService;

    @Scheduled(cron = "0 8 1 * *")
    public void sendMonthlySummaries() {
        // Previous month
        YearMonth prev = YearMonth.now().minusMonths(1);
        int month = prev.getMonthValue();
        int year = prev.getYear();

        log.info("MonthlyCostSummaryJob: sending summaries for {}/{}", month, year);

        customerRepository.findAll().forEach(customer -> {
            try {
                var breakdown = customerQueryRepository.getCostBreakdown(
                    customer.getId(), month, year);
                String msg = String.format(
                    "Monthly summary for %s (%d/%d): total €%.2f",
                    customer.getName(), month, year, breakdown.total()
                );
                whatsAppService.sendText(customer.getWhatsappGroupId(), msg);
            } catch (Exception e) {
                log.warn("Monthly summary failed for customer={}: {}",
                    customer.getId(), e.getMessage());
            }
        });
    }
}
```

Enable scheduling in main application class: `@EnableScheduling`.

---

## Tests

`WhatsAppServiceTest` (unit, `@ExtendWith(MockitoExtension.class)`):
```java
// props.isConfigured() = false → no HTTP call, logs INFO
// props.isConfigured() = true, RestClient throws → logs WARN, no exception propagated
// props.isConfigured() = true, success → logs INFO
```

`WhatsAppEventListenerTest` (unit):
```java
// RequestCreatedEvent published → whatsAppService.sendText called with correct groupId
// RequestStatusChangedEvent published → sendText called with newStatus in message
```

No integration test against real WhatsApp API — unit tests with mocked `WhatsAppService` are sufficient.

---

## Acceptance criteria

- [ ] `WhatsAppService.sendText` logs at INFO when dispatch is called
- [ ] When `WHATSAPP_API_TOKEN` not set: logs "WhatsApp not configured, skipping", no HTTP call
- [ ] HTTP failure → WARN log, no exception propagated, no transaction rollback
- [ ] `@Scheduled(cron = "0 8 1 * *")` annotation present on `sendMonthlySummaries`
- [ ] Unit tests pass

## Automated checks

```bash
cd api
./mvnw test -Dtest=WhatsAppServiceTest,WhatsAppEventListenerTest
./mvnw verify
```
