# Backend — Time Tracking Report Endpoint

## Domain

backend

## Plan

`plans/plan-05-dashboard-costs.md`

## Depends on

- `tasks/plan-03-requests/00-backend-request-entity.md` — Request entity with done_at, RequestType
- `tasks/plan-02-customers-assets/00-backend-customer-entity.md` — CustomerRepository

## References

- `specs/backend.md#time-tracking-rules` — admin only, done requests, per-type breakdown
- `docs/contracts.md#get-customersidtime-report`

## Context

`GET /customers/{id}/time-report` — admin only. Returns per-request-type breakdown computed via jOOQ from done requests: count, avg time in minutes, total minutes. Uses same `EXTRACT(EPOCH FROM (done_at - created_at)) / 60` formula as `time_spent_minutes` in request detail.

---

### Inlined spec excerpts

**GET /customers/{id}/time-report:**
```
Auth: admin only
Response 200:
{
  customer_id: UUID,
  customer_name: string,
  rows: [
    {
      request_type: string,
      count: int,
      avg_minutes: double,
      total_minutes: long
    }
  ],
  grand_total_minutes: long
}
Errors: 404 (customer not found)
```

**Computation:**
```sql
SELECT
  type AS request_type,
  COUNT(*) AS count,
  AVG(EXTRACT(EPOCH FROM (done_at - created_at)) / 60) AS avg_minutes,
  SUM(EXTRACT(EPOCH FROM (done_at - created_at)) / 60) AS total_minutes
FROM requests
WHERE customer_id = :customerId
  AND status = 'done'
  AND done_at IS NOT NULL
GROUP BY type
ORDER BY type
```

---

## Implementation

### 1. Response DTOs

`com.tetramobile.tetra.request.dto.TimeReportRow`:
```java
public record TimeReportRow(
    String requestType,
    int count,
    double avgMinutes,
    long totalMinutes
) {}
```

`com.tetramobile.tetra.request.dto.TimeReportResponse`:
```java
public record TimeReportResponse(
    UUID customerId,
    String customerName,
    List<TimeReportRow> rows,
    long grandTotalMinutes
) {}
```

### 2. TimeTrackingRepository (jOOQ)

`com.tetramobile.tetra.request.TimeTrackingRepository`:
```java
@Repository
@RequiredArgsConstructor
public class TimeTrackingRepository {

    private final DSLContext dsl;

    public List<TimeReportRow> getTimeReport(UUID customerId) {
        var r = REQUESTS.as("r");

        // EXTRACT(EPOCH FROM (done_at - created_at)) / 60
        var minutesExpr = DSL.field(
            "EXTRACT(EPOCH FROM ({0} - {1})) / 60",
            Double.class,
            r.DONE_AT, r.CREATED_AT
        );

        return dsl
            .select(
                r.TYPE.as("request_type"),
                DSL.count().as("count"),
                DSL.avg(minutesExpr).as("avg_minutes"),
                DSL.sum(minutesExpr).cast(Long.class).as("total_minutes")
            )
            .from(r)
            .where(r.CUSTOMER_ID.eq(customerId)
                .and(r.STATUS.eq("done"))
                .and(r.DONE_AT.isNotNull()))
            .groupBy(r.TYPE)
            .orderBy(r.TYPE.asc())
            .fetch(rec -> new TimeReportRow(
                rec.get("request_type", String.class),
                rec.get("count", Integer.class),
                rec.get("avg_minutes", Double.class) != null
                    ? rec.get("avg_minutes", Double.class) : 0.0,
                rec.get("total_minutes", Long.class) != null
                    ? rec.get("total_minutes", Long.class) : 0L
            ));
    }
}
```

### 3. TimeTrackingService

`com.tetramobile.tetra.request.TimeTrackingService`:
```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TimeTrackingService {

    private final CustomerRepository customerRepository;
    private final TimeTrackingRepository timeTrackingRepository;

    public TimeReportResponse getReport(UUID customerId) {
        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new NotFoundException("customer_not_found", "Customer not found"));

        List<TimeReportRow> rows = timeTrackingRepository.getTimeReport(customerId);
        long grandTotal = rows.stream().mapToLong(TimeReportRow::totalMinutes).sum();

        return new TimeReportResponse(customerId, customer.getName(), rows, grandTotal);
    }
}
```

### 4. CustomerController addition

Add to `CustomerController`:
```java
@GetMapping("/customers/{id}/time-report")
public ResponseEntity<TimeReportResponse> timeReport(@PathVariable UUID id) {
    SecurityUtils.requireAdmin();
    return ResponseEntity.ok(timeTrackingService.getReport(id));
}
```

---

## Integration test

`TimeTrackingIT`:
```java
// Create customer, 3 done phone_repair requests (done_at - created_at = ~30min each),
//   1 done onboarding request (~60min)
// GET /customers/{id}/time-report →
//   rows: [{ phone_repair, count=3, avgMinutes≈30, totalMinutes≈90 },
//          { onboarding, count=1, avgMinutes≈60, totalMinutes≈60 }]
//   grandTotalMinutes ≈ 150
// Non-admin → 403
// Unknown customer_id → 404
```

---

## Acceptance criteria

- [ ] `GET /customers/{id}/time-report` returns per-type breakdown from done requests
- [ ] `avg_minutes` and `total_minutes` computed correctly from `done_at - created_at`
- [ ] Non-admin → 403
- [ ] Customer with no done requests → `rows: []`, `grand_total_minutes: 0`
- [ ] `./mvnw test -Dtest=TimeTrackingIT` passes

## Automated checks

```bash
cd api
./mvnw test -Dtest=TimeTrackingIT
./mvnw verify
```
