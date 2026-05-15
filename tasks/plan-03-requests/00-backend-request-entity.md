# Backend — Request, RequestPart, Attachment Entities + Domain Events

## Domain

backend

## Plan

`plans/plan-03-requests.md`

## Depends on

- `tasks/plan-02-customers-assets/01-backend-phone-simcard-entities.md` — Phone, SimCard repositories exist
- `tasks/plan-02-customers-assets/00-backend-customer-entity.md` — Customer entity exists

## References

- `specs/backend.md#request-rules` — status flow, author field, fee field
- `docs/contracts.md` — RequestSummary, RequestDetail, RequestPart, AttachmentSummary types

## Context

Define all JPA entities, enums, repositories, and domain event classes for the request subsystem. Plan-02 introduced a stub `Request` entity with only `id`; this task replaces it with the full entity. The stub `RequestRepository` in `DashboardServiceImpl` continues to compile — no signature changes needed.

**Field names follow contracts.md exactly:**
- Request: `notes` (not `description`), `fee` (nullable, set by admin), `author` (customer|company)
- RequestPart: `description` + `cost` (not `name`/`fee`)
- AttachmentSummary: `id`, `uploaded_by_user_id`, `created_at` only

---

### Inlined spec excerpts

**Request fields:**
```
id UUID PK
customer_id UUID FK
type VARCHAR(30) NOT NULL
status VARCHAR(20) NOT NULL DEFAULT 'submitted'
notes TEXT nullable            ← field is "notes", not "description"
author VARCHAR(10) NOT NULL    ← 'customer' or 'company'; set at creation from caller role
fee NUMERIC(10,2)              ← nullable; set by admin via PATCH
phone_id UUID FK nullable
sim_card_id UUID FK nullable
done_at TIMESTAMPTZ nullable
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**RequestPart fields:** `id, request_id, description VARCHAR(255), cost NUMERIC(10,2), created_at`

**Attachment fields:** `id, request_id, storage_key VARCHAR(500), original_filename VARCHAR(255), content_type VARCHAR(100), uploaded_by UUID FK users.id, created_at`

**Domain events:**
- `RequestCreatedEvent(requestId, customerId, requestType, author, customerWhatsappGroupId)`
- `RequestStatusChangedEvent(requestId, customerId, oldStatus, newStatus, customerWhatsappGroupId)`

---

## Implementation

### 1. Enums

```java
public enum RequestType {
    phone_repair, phone_replacement, sim_topup, new_sim, manual_support, onboarding
}

public enum RequestStatus {
    submitted, in_progress, done
}

public enum RequestAuthor {
    customer, company
}
```

### 2. Request entity

```java
@Entity
@Table(name = "requests")
@Getter @Setter
@EntityListeners(AuditingEntityListener.class)
public class Request {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private RequestType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RequestStatus status = RequestStatus.submitted;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "author", nullable = false, length = 10)
    private RequestAuthor author;

    @Column(name = "fee", precision = 10, scale = 2)
    private BigDecimal fee;

    @Column(name = "phone_id")
    private UUID phoneId;

    @Column(name = "sim_card_id")
    private UUID simCardId;

    @Column(name = "done_at")
    private Instant doneAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
```

### 3. RequestPart entity

```java
@Entity
@Table(name = "request_parts")
@Getter @Setter
@EntityListeners(AuditingEntityListener.class)
public class RequestPart {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    @Column(name = "description", nullable = false, length = 255)
    private String description;   // ← "description", not "name"

    @Column(name = "cost", nullable = false, precision = 10, scale = 2)
    private BigDecimal cost;      // ← "cost", not "fee"

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
```

### 4. Attachment entity

```java
@Entity
@Table(name = "attachments")
@Getter @Setter
@EntityListeners(AuditingEntityListener.class)
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "uploaded_by")
    private UUID uploadedBy;  // FK users.id

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
```

### 5. Repositories

```java
public interface RequestRepository extends JpaRepository<Request, UUID> {
    long countByStatusNot(RequestStatus status);
    long countByCustomerIdAndStatusNot(UUID customerId, RequestStatus status);

    @Query("SELECT r FROM Request r WHERE r.customerId = :cid AND r.status = 'done'" +
        " AND FUNCTION('MONTH', r.doneAt) = :month AND FUNCTION('YEAR', r.doneAt) = :year")
    List<Request> findDoneByCustomerAndPeriod(@Param("cid") UUID customerId,
        @Param("month") int month, @Param("year") int year);

    @Query("SELECT r FROM Request r WHERE r.status = 'done'" +
        " AND FUNCTION('MONTH', r.doneAt) = :month AND FUNCTION('YEAR', r.doneAt) = :year")
    List<Request> findDoneByPeriod(@Param("month") int month, @Param("year") int year);
}

public interface RequestPartRepository extends JpaRepository<RequestPart, UUID> {
    List<RequestPart> findByRequestId(UUID requestId);
}

public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {
    List<Attachment> findByRequestId(UUID requestId);
}
```

### 6. Domain event classes

```java
public record RequestCreatedEvent(
    UUID requestId,
    UUID customerId,
    RequestType requestType,
    RequestAuthor author,
    String customerWhatsappGroupId
) {}

public record RequestStatusChangedEvent(
    UUID requestId,
    UUID customerId,
    RequestStatus oldStatus,
    RequestStatus newStatus,
    String customerWhatsappGroupId
) {}
```

### 7. Wire in DashboardServiceImpl

Replace stub import with full `RequestRepository`. Activate:
```java
long openRequests = requestRepository.countByStatusNot(RequestStatus.done);
```

### 8. Flyway migration check

Verify V1 schema has `requests.notes TEXT`, `requests.author VARCHAR(10)`, `requests.fee NUMERIC(10,2)` columns. `request_parts` must have `description` and `cost` (not `name`/`fee`). If columns differ, create `V2__fix_request_fields.sql`.

---

## Integration tests

`RequestEntityIT` (`@DataJpaTest`):
- Persist Request with `author=customer` → verify all fields stored correctly
- Persist RequestPart with `description`/`cost` → verify stored
- `countByStatusNot(done)` on 2 submitted + 1 done → returns 2

---

## Acceptance criteria

- [ ] Request entity fields: `notes`, `author`, `fee` (nullable) — no `description` field
- [ ] RequestPart fields: `description`, `cost` — no `name`/`fee`
- [ ] `RequestRepository.countByStatusNot(done)` returns live count
- [ ] `./mvnw test -Dtest=RequestEntityIT` passes

## Automated checks

```bash
cd api
./mvnw test -Dtest=RequestEntityIT
./mvnw compile
```
