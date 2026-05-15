# Backend — Phone and SIM Card Entities + Services

## Domain

backend

## Plan

`plans/plan-02-customers-assets.md`

## Depends on

- `tasks/plan-02-customers-assets/00-backend-customer-entity.md` — `CustomerRepository`, `Customer` entity must exist

## References

- `specs/backend.md#phone-rules` and `#sim-card-rules` — full business logic
- `docs/contracts.md#get-customersidphones` through `PUT /sim-cards/{id}/monthly-billing`

## Context

Create Phone, SimCard, and SimMonthlyBilling JPA entities with repositories, implement PhoneService and SimCardService with all CRUD endpoints and validation rules. Domain event listeners for request side-effects (phone_replacement, phone_repair, new_sim) are stubbed here but wired in plan-03 when RequestService emits events.

---

### Inlined spec excerpts

**Contracts:**

```
GET /customers/{id}/phones
  Auth: admin, company, customer (own)
  Query: include_replaced=false
  Response 200: { phones: PhoneSummary[] }
  Errors: 401, 403, 404

POST /customers/{id}/phones
  Auth: admin only
  Request: { model: string, ownership: "customer"|"company" }
  Response 201: PhoneSummary
  Errors: 401, 403, 404

PATCH /phones/{id}
  Auth: admin only
  Request: { model?: string, ownership?: string, status?: "active"|"in_repair"|"replaced" }
  Response 200: PhoneSummary
  Errors: 401, 403, 404, 422 invalid_status_transition

GET /customers/{id}/sim-cards
  Auth: admin, company, customer (own)
  Query: include_cancelled=false
  Response 200: { sim_cards: SimCardSummary[] }
  Errors: 401, 403, 404

POST /customers/{id}/sim-cards
  Auth: admin only
  Request: { type: "prepaid"|"postpaid", base_monthly_fee: number, phone_id?: uuid }
  Response 201: SimCardSummary
  Errors: 401, 403, 404, 422 phone_belongs_to_different_customer, 422 phone_already_has_sim

PATCH /sim-cards/{id}
  Auth: admin only
  Request: { phone_id?: uuid|null, base_monthly_fee?: number, status?: string }
  Response 200: SimCardSummary
  Errors: 401, 403, 404, 422 phone_belongs_to_different_customer, 422 phone_already_has_sim

PUT /sim-cards/{id}/monthly-billing
  Auth: admin only
  Request: { period_month: int, period_year: int, actual_amount: number }
  Response 200: { sim_card_id, period_month, period_year, actual_amount }
  Errors: 401, 403, 404, 422 sim_card_not_postpaid
```

**PhoneSummary shape:**
```json
{
  "id": "uuid", "model": "string",
  "ownership": "customer|company",
  "status": "active|in_repair|replaced",
  "customer_id": "uuid",
  "sim_card": { "id": "uuid", "type": "prepaid|postpaid", "base_monthly_fee": 0.00 } | null,
  "is_unused": true,
  "created_at": "ISO8601"
}
```

**SimCardSummary shape:**
```json
{
  "id": "uuid", "type": "prepaid|postpaid", "base_monthly_fee": 0.00,
  "status": "active|unassigned|cancelled",
  "customer_id": "uuid", "phone_id": "uuid|null",
  "is_unused": true, "created_at": "ISO8601"
}
```

**Phone business rules:**
- Created with `status = 'active'`
- `is_unused` = (`status = 'active'` OR `status = 'in_repair'`) AND no non-cancelled SIM references this phone
- Valid `PATCH` transitions: `active ↔ in_repair`. Setting `status = 'replaced'` via PATCH → 422 `invalid_status_transition`
- `replaced` set only via `RequestDoneEvent` listener (stub in this task)

**SIM card business rules:**
- Created with `status = 'active'` if `phone_id` provided; `'unassigned'` otherwise
- `is_unused` = (`status = 'active'` OR `status = 'unassigned'`) AND `phone_id IS NULL`
- `phone_id` assignment validations: phone exists, belongs to same customer, no other non-cancelled SIM already on that phone
- `PATCH` with `phone_id = null` → unassigns, sets `status = 'unassigned'`
- `PATCH` with non-null `phone_id` → assigns, sets `status = 'active'`, same validations as creation
- `PUT /monthly-billing` only for `type = 'postpaid'` → else 422 `sim_card_not_postpaid`
- Monthly billing upsert: `INSERT … ON CONFLICT (sim_card_id, period_month, period_year) DO UPDATE`

---

## Implementation

### 1. Phone entity + repository

Create `com.tetramobile.tetra.phone.model.Phone`:
```java
@Entity @Table(name = "phones")
public class Phone {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false) private String model;
    @Column(nullable = false) @Enumerated(EnumType.STRING) private Ownership ownership;
    @Column(name = "customer_id", nullable = false) private UUID customerId;
    @Column(nullable = false) @Enumerated(EnumType.STRING) private PhoneStatus status = PhoneStatus.active;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt = Instant.now();
}
```

Enums: `Ownership { customer, company }`, `PhoneStatus { active, in_repair, replaced }`.

`PhoneRepository`:
```java
public interface PhoneRepository extends JpaRepository<Phone, UUID> {
    List<Phone> findByCustomerIdAndStatusNot(UUID customerId, PhoneStatus excluded, Sort sort);
    List<Phone> findByCustomerId(UUID customerId, Sort sort);
    boolean existsByIdAndCustomerId(UUID phoneId, UUID customerId);
}
```

### 2. SimCard + SimMonthlyBilling entities

`com.tetramobile.tetra.simcard.model.SimCard`:
```java
@Entity @Table(name = "sim_cards")
public class SimCard {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false) @Enumerated(EnumType.STRING) private SimType type;
    @Column(name = "base_monthly_fee", nullable = false) private BigDecimal baseMonthlyFee;
    @Column(name = "customer_id", nullable = false) private UUID customerId;
    @Column(name = "phone_id") private UUID phoneId;
    @Column(nullable = false) @Enumerated(EnumType.STRING) private SimStatus status;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt = Instant.now();
}
```

Enums: `SimType { prepaid, postpaid }`, `SimStatus { active, unassigned, cancelled }`.

`com.tetramobile.tetra.simcard.model.SimMonthlyBilling`:
```java
@Entity @Table(name = "sim_monthly_billing")
public class SimMonthlyBilling {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "sim_card_id", nullable = false) private UUID simCardId;
    @Column(name = "period_month", nullable = false) private int periodMonth;
    @Column(name = "period_year", nullable = false) private int periodYear;
    @Column(name = "actual_amount", nullable = false) private BigDecimal actualAmount;
}
```

`SimCardRepository`:
```java
public interface SimCardRepository extends JpaRepository<SimCard, UUID> {
    List<SimCard> findByCustomerId(UUID customerId, Sort sort);
    List<SimCard> findByCustomerIdAndStatusNot(UUID customerId, SimStatus excluded, Sort sort);
    boolean existsByIdAndCustomerId(UUID simId, UUID customerId);
    long countByPhoneIdAndStatusNot(UUID phoneId, SimStatus excluded);
}
```

`SimMonthlyBillingRepository`:
```java
public interface SimMonthlyBillingRepository extends JpaRepository<SimMonthlyBilling, UUID> {
    Optional<SimMonthlyBilling> findBySimCardIdAndPeriodMonthAndPeriodYear(UUID simCardId, int month, int year);

    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO sim_monthly_billing (id, sim_card_id, period_month, period_year, actual_amount)
        VALUES (gen_random_uuid(), :simCardId, :month, :year, :amount)
        ON CONFLICT (sim_card_id, period_month, period_year)
        DO UPDATE SET actual_amount = EXCLUDED.actual_amount
        """, nativeQuery = true)
    void upsert(@Param("simCardId") UUID simCardId,
                @Param("month") int month,
                @Param("year") int year,
                @Param("amount") BigDecimal amount);
}
```

### 3. PhoneService

`com.tetramobile.tetra.phone.PhoneServiceImpl` key logic:

**listPhones:** if `includeReplaced`, return `findByCustomerId`; else `findByCustomerIdAndStatusNot(id, replaced)`. For each phone, compute `is_unused`: phone status is active/in_repair AND `simCardRepository.countByPhoneIdAndStatusNot(phone.getId(), cancelled) == 0`. Check caller ownership for customer role.

**createPhone:** validate customer exists. Create phone with `status = active`.

**updatePhone (PATCH):** Reject `status = replaced` → 422 `invalid_status_transition`. Apply field patches. Save.

**PhoneSummary construction:** For each phone, find its assigned SIM (`simCardRepository.findByPhoneIdAndStatusNot` — add this derived method). Include slim SIM info (id, type, base_monthly_fee) or null.

Add `findByPhoneIdAndStatusNot(UUID phoneId, SimStatus excluded)` to `SimCardRepository` (returns Optional<SimCard>).

### 4. SimCardService

`com.tetramobile.tetra.simcard.SimCardServiceImpl` key logic:

**validatePhoneAssignment(customerId, phoneId):**
```java
Phone phone = phoneRepository.findById(phoneId)
    .orElseThrow(() -> new NotFoundException("Phone not found"));
if (!phone.getCustomerId().equals(customerId))
    throw new UnprocessableEntityException("phone_belongs_to_different_customer", "...");
if (simCardRepository.countByPhoneIdAndStatusNot(phoneId, SimStatus.cancelled) > 0)
    throw new UnprocessableEntityException("phone_already_has_sim", "...");
```

**createSimCard:** call `validatePhoneAssignment` if `phone_id` provided. Set `status = active` if phone assigned, `unassigned` otherwise.

**updateSimCard (PATCH):**
- If `phone_id` explicitly set to `null`: clear `phoneId`, set `status = unassigned`
- If `phone_id` set to a UUID: `validatePhoneAssignment`, set `status = active`
- If `status` provided: set status directly (admin can manually cancel)
- If `base_monthly_fee` provided: update

**updateMonthlyBilling:** validate SIM is postpaid; call `simMonthlyBillingRepository.upsert(...)`.

### 5. Phone + SIM controllers

Create `com.tetramobile.tetra.phone.PhoneController`:
```java
@RestController @RequestMapping("/api/v1")
public class PhoneController {
    @GetMapping("/customers/{id}/phones")  // → phoneService.listPhones
    @PostMapping("/customers/{id}/phones") // → phoneService.createPhone (requireAdmin)
    @PatchMapping("/phones/{id}")          // → phoneService.updatePhone (requireAdmin)
}
```

Create `com.tetramobile.tetra.simcard.SimCardController`:
```java
@RestController @RequestMapping("/api/v1")
public class SimCardController {
    @GetMapping("/customers/{id}/sim-cards")         // → simCardService.listSimCards
    @PostMapping("/customers/{id}/sim-cards")        // → simCardService.createSimCard (requireAdmin)
    @PatchMapping("/sim-cards/{id}")                 // → simCardService.updateSimCard (requireAdmin)
    @PutMapping("/sim-cards/{id}/monthly-billing")   // → simCardService.updateMonthlyBilling (requireAdmin)
}
```

### 6. Domain event stubs (plan-03 will wire these)

Create empty `@Component` listener classes in phone and simcard packages:
```java
@Component
public class PhoneRequestEventListener {
    // @TransactionalEventListener methods added in plan-03
}
@Component
public class SimCardRequestEventListener {
    // @TransactionalEventListener methods added in plan-03
}
```

### 7. Integration tests

`PhoneControllerIT`:
- Create customer + create phone → 201 PhoneSummary with `is_unused=true` (no SIM)
- Create SIM card assigned to that phone → phone becomes `is_unused=false`
- `PATCH /phones/{id}` with `status=replaced` → 422 `invalid_status_transition`
- `PATCH /phones/{id}` with `status=in_repair` → 200, status updated

`SimCardControllerIT`:
- Create SIM with `phone_id` → status=active
- Create SIM without `phone_id` → status=unassigned, is_unused=true
- Assign phone already having a SIM → 422 `phone_already_has_sim`
- `PUT /monthly-billing` on prepaid SIM → 422 `sim_card_not_postpaid`
- `PUT /monthly-billing` on postpaid SIM → 200; calling again for same period replaces value

---

## Acceptance criteria

- [ ] `GET /customers/{id}/phones` returns PhoneSummary list with correct `is_unused` computation
- [ ] Phone status transition `active → replaced` via PATCH returns 422
- [ ] `POST /customers/{id}/sim-cards` with a phone_id already assigned → 422 `phone_already_has_sim`
- [ ] SIM monthly billing upsert is idempotent per (sim_card_id, month, year)
- [ ] Customer role cannot access another customer's phones or SIMs (403)
- [ ] `./mvnw verify` passes

## Automated checks

```bash
cd api
./mvnw test -Dtest=PhoneControllerIT,SimCardControllerIT
./mvnw verify
```
