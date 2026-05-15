# Backend — Customer Entity and Basic CRUD

## Domain

backend

## Plan

`plans/plan-02-customers-assets.md`

## Depends on

`tasks/plan-01-auth/01-backend-security-infra.md` — `SecurityUtils`, typed exceptions, `PagedResponse` must exist.

## References

- `specs/backend.md#customer-rules` — business logic for customer access scoping
- `docs/contracts.md#post-customers` through `PATCH /customers/{id}`

## Context

Create the `Customer` JPA entity, `CustomerRepository`, `CustomerService` (basic CRUD only — no summary stats yet), and `CustomerController`. Replace the placeholder `Customer` stub created in plan-01. The jOOQ-based list with summary stats is task 02; this task only handles `POST`, `GET /customers/{id}`, and `PATCH /customers/{id}`.

---

### Inlined spec excerpts

**Customer table (already in DB):**
```sql
customers(id UUID PK, name VARCHAR, contact_info VARCHAR,
          whatsapp_group_id VARCHAR, created_at TIMESTAMP)
```

**POST /customers**
```
Auth: admin only
Request: { name: string, contact_info: string, whatsapp_group_id: string }
Response 201: CustomerDetail
Errors: 401 unauthenticated, 403 forbidden
```

**GET /customers/{id}**
```
Auth: admin, company, customer (own customer_id only)
Response 200: CustomerDetail
Errors: 401, 403 forbidden (customer accessing other), 404 not_found
```

**PATCH /customers/{id}**
```
Auth: admin only
Request: { name?: string, contact_info?: string, whatsapp_group_id?: string }
Response 200: CustomerDetail
Errors: 401, 403, 404
```

**CustomerDetail shape:**
```json
{
  "id": "uuid", "name": "string", "contact_info": "string",
  "whatsapp_group_id": "string",
  "phone_count": 0, "sim_card_count": 0,
  "open_request_count": 0, "current_month_cost": 0.00,
  "created_at": "ISO8601"
}
```
Note: `phone_count`, `sim_card_count`, `open_request_count`, `current_month_cost` are 0 in this task — wired in task 02.

**Business rule:** Customer role accessing `GET /customers/{id}` where `id != authenticated_user.customer_id` → throw `ForbiddenException("forbidden", "Access denied")`. Must return 403, not 404 — prevents enumeration.

---

## Implementation

1. Replace the stub `Customer` entity in `com.tetramobile.tetra.customer.model.Customer` with the full entity:

```java
@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "contact_info")
    private String contactInfo;

    @Column(name = "whatsapp_group_id")
    private String whatsappGroupId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // getters + setters
}
```

2. Replace stub `CustomerRepository` with full interface:

```java
public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    // jOOQ handles the summary list query — no derived query methods needed here
}
```

3. Create `CustomerDetailResponse` DTO in `com.tetramobile.tetra.customer.dto`:

```java
public record CustomerDetailResponse(
    UUID id, String name, String contactInfo, String whatsappGroupId,
    int phoneCount, int simCardCount, int openRequestCount,
    BigDecimal currentMonthCost, Instant createdAt
) {
    public static CustomerDetailResponse from(Customer c) {
        return new CustomerDetailResponse(
            c.getId(), c.getName(), c.getContactInfo(), c.getWhatsappGroupId(),
            0, 0, 0, BigDecimal.ZERO, c.getCreatedAt()
        );
    }
}
```

4. Create `CustomerService` interface + `CustomerServiceImpl`:

```java
public interface CustomerService {
    CustomerDetailResponse createCustomer(CreateCustomerRequest request);
    CustomerDetailResponse getCustomer(UUID id, AuthenticatedUser caller);
    CustomerDetailResponse updateCustomer(UUID id, UpdateCustomerRequest request);
}
```

**getCustomer logic:**
```java
Customer customer = customerRepository.findById(id)
    .orElseThrow(() -> new NotFoundException("Customer not found"));
if (caller.isCustomer() && !id.equals(caller.customerId()))
    throw new ForbiddenException("forbidden", "Access denied");
return CustomerDetailResponse.from(customer);
```

5. Create `CustomerController`:

```java
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping("/customers")
    public ResponseEntity<CustomerDetailResponse> create(
            @Valid @RequestBody CreateCustomerRequest request) {
        SecurityUtils.requireAdmin();
        return ResponseEntity.status(201).body(customerService.createCustomer(request));
    }

    @GetMapping("/customers/{id}")
    public ResponseEntity<CustomerDetailResponse> get(@PathVariable UUID id) {
        AuthenticatedUser caller = SecurityUtils.currentUser();
        SecurityUtils.requireAdminOrCompany(); // customer route handled inside service
        // Allow customer too — service checks ownership
        return ResponseEntity.ok(customerService.getCustomer(id, caller));
    }

    @PatchMapping("/customers/{id}")
    public ResponseEntity<CustomerDetailResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCustomerRequest request) {
        SecurityUtils.requireAdmin();
        return ResponseEntity.ok(customerService.updateCustomer(id, request));
    }
}
```

Fix `requireAdminOrCompany` — it must NOT block customers for `GET /customers/{id}` since customers are allowed to see their own. Use `SecurityUtils.currentUser()` directly in the controller for this endpoint; ownership enforcement is in the service.

6. Create DTOs: `CreateCustomerRequest` (`name`, `contactInfo`, `whatsappGroupId` — all `@NotBlank`), `UpdateCustomerRequest` (all optional).

7. Integration test `CustomerControllerIT`:
   - `POST /customers` as admin → 201, returned CustomerDetail has phone_count=0
   - `POST /customers` as company → 403
   - `GET /customers/{id}` as customer with own id → 200
   - `GET /customers/{id}` as customer with different id → 403
   - `GET /customers/{unknown-id}` as admin → 404

---

## Acceptance criteria

- [ ] `POST /customers` creates customer and returns CustomerDetail with computed fields = 0
- [ ] `GET /customers/{id}` returns 403 (not 404) for customer accessing another customer's record
- [ ] `PATCH /customers/{id}` partial update — unchanged fields are preserved
- [ ] `./mvnw verify` passes

## Automated checks

```bash
cd api && ./mvnw test -Dtest=CustomerControllerIT
./mvnw verify
```
