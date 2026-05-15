# Backend — Customer Aggregations, Dashboard Stats, Cost Breakdown

## Domain

backend

## Plan

`plans/plan-02-customers-assets.md`

## Depends on

- `tasks/plan-02-customers-assets/01-backend-phone-simcard-entities.md` — Phone, SimCard, SimMonthlyBilling repositories must exist

## References

- `specs/backend.md#customer-rules` — CustomerSummary field definitions
- `specs/backend.md#dashboard-stats-rules` and `#cost-breakdown-rules`
- `docs/contracts.md#get-customers` — CustomerSummary list, GET /dashboard/stats, GET /customers/{id}/cost-breakdown

## Context

Implement the three remaining read-heavy endpoints using jOOQ: `GET /customers` (paginated list with per-customer aggregate stats), `GET /dashboard/stats` (four global counts), and `GET /customers/{id}/cost-breakdown` (SIM fee line items + request fee line items — request fees are 0 for now since requests don't exist yet; updated in plan-03 when `RequestRepository` is available). After this task all CustomerSummary fields are live.

---

### Inlined spec excerpts

**GET /customers**
```
Auth: admin, company
Query: page, size, search (name contains, case-insensitive)
Response 200: PagedResponse<CustomerSummary>
CustomerSummary fields:
  id, name, contact_info,
  phone_count     = COUNT phones WHERE status != 'replaced'
  sim_card_count  = COUNT sim_cards WHERE status != 'cancelled'
  open_request_count = COUNT requests WHERE status != 'done'
  current_month_cost = SUM(SIM fees for this month) + SUM(done request fees this month)
  created_at
```

**GET /dashboard/stats**
```
Auth: admin, company
Response 200:
  total_customers  = COUNT(customers)
  total_phones     = COUNT(phones WHERE status != 'replaced')
  total_sim_cards  = COUNT(sim_cards WHERE status != 'cancelled')
  open_requests    = COUNT(requests WHERE status != 'done')
```

**GET /customers/{id}/cost-breakdown**
```
Auth: admin, company, customer (own)
Query: month (required), year (required)
Response 200: CostBreakdown
  sim_fees: [{ sim_card_id, sim_card_type, amount, is_actual }]
    - for each non-cancelled SIM of this customer:
      if sim_monthly_billing row exists for (sim_card_id, month, year): use actual_amount, is_actual=true
      else: use base_monthly_fee, is_actual=false
  request_fees: []  ← empty in plan-02; plan-03 populates this
  total = sum(sim_fees.amount) + sum(request_fees.amount)
Errors: 401, 403 forbidden (customer own only), 404, 422 missing_period
```

**current_month_cost formula (for CustomerSummary list):**
Same logic as cost breakdown but scoped to current calendar month (LocalDate.now().getMonth/Year). SIM fees only in plan-02. Request fee sum added in plan-03.

---

## Implementation

### 1. jOOQ DSL class setup

Ensure jOOQ code generation is configured in `pom.xml` to generate from the Flyway migration schema (using `jooq-meta-extensions-liquibase` or `jooq-meta-extensions-ddl` approach, or `testcontainers` database during build). Configure the jOOQ Maven plugin:

```xml
<plugin>
  <groupId>org.jooq</groupId>
  <artifactId>jooq-codegen-maven</artifactId>
  <version>3.19.14</version>
  <configuration>
    <generator>
      <database>
        <name>org.jooq.meta.extensions.ddl.DDLDatabase</name>
        <properties>
          <property>
            <key>scripts</key>
            <value>src/main/resources/db/migration/V1__initial_schema.sql</value>
          </property>
        </properties>
      </database>
      <target>
        <packageName>com.tetramobile.tetra.shared.jooq</packageName>
        <directory>target/generated-sources/jooq</directory>
      </target>
    </generator>
  </configuration>
</plugin>
```

Run `./mvnw generate-sources` once to produce the jOOQ DSL classes.

### 2. CustomerRepository — jOOQ list query

Add a jOOQ-based method to a new `CustomerQueryRepository` class in `com.tetramobile.tetra.customer`:

```java
@Repository
@RequiredArgsConstructor
public class CustomerQueryRepository {

    private final DSLContext dsl;

    public Page<CustomerSummaryResponse> listWithStats(String search, Pageable pageable) {
        var customers = CUSTOMERS.as("c");
        var phones = PHONES.as("p");
        var simCards = SIM_CARDS.as("s");
        var requests = REQUESTS.as("r");
        var smb = SIM_MONTHLY_BILLING.as("smb");

        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        int year = now.getYear();

        // phone_count correlated subquery
        var phoneCount = dsl.selectCount().from(phones)
            .where(phones.CUSTOMER_ID.eq(customers.ID)
                .and(phones.STATUS.ne("replaced")))
            .asField("phone_count");

        // sim_card_count correlated subquery
        var simCount = dsl.selectCount().from(simCards)
            .where(simCards.CUSTOMER_ID.eq(customers.ID)
                .and(simCards.STATUS.ne("cancelled")))
            .asField("sim_card_count");

        // open_request_count correlated subquery
        var openReqCount = dsl.selectCount().from(requests)
            .where(requests.CUSTOMER_ID.eq(customers.ID)
                .and(requests.STATUS.ne("done")))
            .asField("open_request_count");

        // current_month_cost: SIM fees for this month (request fees = 0 until plan-03)
        var simFeeSum = dsl
            .select(DSL.coalesce(DSL.sum(
                DSL.when(smb.ACTUAL_AMOUNT.isNotNull(), smb.ACTUAL_AMOUNT)
                   .otherwise(simCards.BASE_MONTHLY_FEE)
            ), BigDecimal.ZERO))
            .from(simCards)
            .leftJoin(smb).on(
                smb.SIM_CARD_ID.eq(simCards.ID)
                .and(smb.PERIOD_MONTH.eq(month))
                .and(smb.PERIOD_YEAR.eq(year))
            )
            .where(simCards.CUSTOMER_ID.eq(customers.ID)
                .and(simCards.STATUS.ne("cancelled")))
            .asField("current_month_cost");

        // Base SELECT
        var query = dsl.select(
                customers.ID, customers.NAME, customers.CONTACT_INFO,
                customers.WHATSAPP_GROUP_ID, customers.CREATED_AT,
                phoneCount, simCount, openReqCount, simFeeSum
            )
            .from(customers);

        // Optional name search
        if (search != null && !search.isBlank()) {
            query = query.where(DSL.lower(customers.NAME).contains(search.toLowerCase()));
        }

        int total = dsl.fetchCount(query);

        var rows = query
            .orderBy(customers.NAME.asc())
            .limit(pageable.getPageSize())
            .offset(pageable.getOffset())
            .fetch(r -> new CustomerSummaryResponse(
                r.get(customers.ID),
                r.get(customers.NAME),
                r.get(customers.CONTACT_INFO),
                r.get("phone_count", Integer.class),
                r.get("sim_card_count", Integer.class),
                r.get("open_request_count", Integer.class),
                r.get("current_month_cost", BigDecimal.class),
                r.get(customers.CREATED_AT).toInstant()
            ));

        return new PageImpl<>(rows, pageable, total);
    }
}
```

Add `CustomerSummaryResponse` record (same fields as `CustomerDetailResponse` minus `whatsapp_group_id`).

### 3. CustomerController — add GET /customers list

Add to `CustomerController`:
```java
@GetMapping("/customers")
public ResponseEntity<PagedResponse<CustomerSummaryResponse>> list(
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") @Max(100) int size) {
    SecurityUtils.requireAdminOrCompany();
    Pageable pageable = PageRequest.of(page, size);
    return ResponseEntity.ok(PagedResponse.from(customerService.listCustomers(search, pageable)));
}
```

`CustomerServiceImpl.listCustomers` delegates to `customerQueryRepository.listWithStats(search, pageable)`.

### 4. DashboardService + DashboardController

Create `com.tetramobile.tetra.dashboard.DashboardServiceImpl`:

```java
@Service @RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {
    private final CustomerRepository customerRepository;
    private final PhoneRepository phoneRepository;
    private final SimCardRepository simCardRepository;
    private final RequestRepository requestRepository; // stub — 0 until plan-03

    public DashboardStatsResponse getStats() {
        long totalCustomers = customerRepository.count();
        long totalPhones = phoneRepository.countByStatusNot(PhoneStatus.replaced);
        long totalSimCards = simCardRepository.countByStatusNot(SimStatus.cancelled);
        long openRequests = 0; // requestRepository.countByStatusNot(done) — wired in plan-03
        return new DashboardStatsResponse(totalCustomers, totalPhones, totalSimCards, openRequests);
    }
}
```

Add `countByStatusNot` derived queries to Phone and SimCard repositories.

Add stub `RequestRepository` interface in `com.tetramobile.tetra.request` (empty, extending `JpaRepository<Request, UUID>`) + stub `Request` entity with just `id` UUID field — sufficient for count query. Full Request entity wired in plan-03.

Create `DashboardController`:
```java
@RestController @RequestMapping("/api/v1/dashboard")
public class DashboardController {
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> stats() {
        SecurityUtils.requireAdminOrCompany();
        return ResponseEntity.ok(dashboardService.getStats());
    }
}
```

`DashboardStatsResponse` record: `totalCustomers`, `totalPhones`, `totalSimCards`, `openRequests` (all long).

### 5. CustomerService — add cost breakdown

Add `GET /customers/{id}/cost-breakdown` to `CustomerController`:
```java
@GetMapping("/customers/{id}/cost-breakdown")
public ResponseEntity<CostBreakdownResponse> costBreakdown(
        @PathVariable UUID id,
        @RequestParam(required = false) Integer month,
        @RequestParam(required = false) Integer year) {
    if (month == null || year == null)
        throw new UnprocessableEntityException("missing_period", "month and year are required");
    AuthenticatedUser caller = SecurityUtils.currentUser();
    if (caller.isCustomer() && !id.equals(caller.customerId()))
        throw new ForbiddenException("forbidden", "Access denied");
    return ResponseEntity.ok(customerService.getCostBreakdown(id, month, year, caller));
}
```

`CustomerService.getCostBreakdown` logic:
- Validate customer exists (throw NotFoundException if not)
- Fetch all non-cancelled SIMs for customer
- For each SIM, check `simMonthlyBillingRepository.findBySimCardIdAndPeriodMonthAndPeriodYear`; use actual_amount (is_actual=true) or base_monthly_fee (is_actual=false)
- `request_fees = []` (empty list — plan-03 fills this)
- `total` = sum of SIM fee amounts

`CostBreakdownResponse` record matching `CostBreakdown` contract shape (period_month, period_year, sim_fees list, request_fees list, total).

### 6. Integration tests

`CustomerListIT`:
- Create 3 customers, 2 phones for customer-1 (1 replaced, 1 active), 1 SIM for customer-1
- `GET /customers?search=customer-1-name` → 1 result, phone_count=1 (replaced excluded), sim_card_count=1
- `GET /dashboard/stats` → total_customers=3, total_phones=2 (1 active across all), total_sim_cards=1

`CostBreakdownIT`:
- Create customer + postpaid SIM (base_fee=50) + prepaid SIM (base_fee=30)
- `GET /customers/{id}/cost-breakdown?month=5&year=2026` → sim_fees has 2 items, total=80, both is_actual=false
- Upsert monthly billing for postpaid SIM: actual_amount=45
- Repeat cost breakdown → postpaid SIM now is_actual=true, amount=45, total=75

---

## Acceptance criteria

- [ ] `GET /customers` returns paginated CustomerSummary with correct phone_count and sim_card_count
- [ ] `GET /customers?search=foo` filters by name case-insensitively
- [ ] `GET /dashboard/stats` returns live counts
- [ ] `GET /customers/{id}/cost-breakdown` returns SIM fee line items with is_actual flag correct
- [ ] Cost breakdown returns 422 when month or year param is missing
- [ ] `./mvnw verify` passes

## Automated checks

```bash
cd api
./mvnw generate-sources  # generate jOOQ DSL first
./mvnw test -Dtest=CustomerListIT,CostBreakdownIT
./mvnw verify
```
