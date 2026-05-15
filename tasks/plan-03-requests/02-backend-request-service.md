# Backend — RequestService: CRUD, Parts, Asset Side-Effects, Cost Integration

## Domain

backend

## Plan

`plans/plan-03-requests.md`

## Depends on

- `tasks/plan-03-requests/00-backend-request-entity.md` — Request, RequestPart, Attachment entities + repositories + domain event classes
- `tasks/plan-02-customers-assets/01-backend-phone-simcard-entities.md` — PhoneRepository, SimCardRepository, PhoneStatus, SimStatus

## References

- `specs/backend.md#request-rules` — status flow, asset side-effects, fee computation
- `docs/contracts.md#post-requests` through `DELETE /requests/{id}/parts/{partId}`
- `specs/backend.md#cost-breakdown-rules` — request fees appear in cost breakdown after plan-03

## Context

Full request service: create, list (filtered/paginated), get by id, patch status/notes/fee, add/remove parts. Asset side-effects fire via `@TransactionalEventListener(phase = AFTER_COMMIT)` in a new transaction. After this task, `CustomerQueryRepository` cost breakdown uses live request data.

**Field names per contracts.md:**
- Request: `notes` (not `description`), `fee` (nullable, admin sets via PATCH), `author` (customer|company)
- RequestPart: `description` + `cost` (not `name`/`fee`)
- RequestDetail includes embedded `attachments: [AttachmentSummary]` — no separate list endpoint
- `RequestSummary.fee` is the direct admin-set fee, not sum of parts

---

### Inlined spec excerpts

**POST /requests:**
```
Auth: admin, company, customer (own customer_id only)
Body: { customer_id, type, notes?, phone_id?, sim_card_id? }
Rules:
  - customer can only create request for own customer_id
  - phone_id/sim_card_id must belong to customer_id if provided
  - author derived from caller role: customer → 'customer'; admin/company → 'company'
  - status defaults to submitted
  - publish RequestCreatedEvent after commit
Response 201: RequestDetail
```

**GET /requests:**
```
Auth: admin, company, customer
Query: status?, type?, customer_id?, page=0, size=20
Rules:
  - customer sees only own requests (customer_id filter forced)
  - admin/company see all (customer_id filter optional)
Response 200: PagedResponse<RequestSummary>
```

**GET /requests/{id}:**
```
Auth: admin, company, customer (own only)
Response 200: RequestDetail
  RequestDetail fields:
    id, customer_id, customer_name, type, status, notes,
    author, fee (nullable, direct), phone_id, sim_card_id,
    done_at, created_at, updated_at,
    parts: [{ id, description, cost }],
    attachments: [{ id, uploaded_by_user_id, created_at }],
    time_spent_minutes: Long (admin only, null when not done)
```

**PATCH /requests/{id}:**
```
Auth: admin, company
Body: { status?, notes?, fee? }
Rules:
  - fee update: admin only (company cannot set fee)
  - status backwards transition forbidden
  - when status=done: set done_at=now()
  - publish RequestStatusChangedEvent after commit
Response 200: RequestDetail
```

**POST /requests/{id}/parts:**
```
Auth: admin only
Body: { description, cost }
Response 201: { id, description, cost }
```

**DELETE /requests/{id}/parts/{partId}:**
```
Auth: admin only
Response 204
```

**Asset side-effects (RequestStatusChangedEvent when newStatus=done):**
```
phone_repair    → phone.status = active
phone_replacement → old phone.status = replaced; new Phone created (model from notes or 'Replacement phone')
sim_topup       → no asset change
new_sim         → new SimCard created with customer_id, status=active
manual_support  → no asset change
onboarding      → no asset change
```

---

## Implementation

### 1. DTOs / Response records

`com.tetramobile.tetra.request.dto`:

```java
public record CreateRequestRequest(
    @NotNull UUID customerId,
    @NotNull RequestType type,
    String notes,
    UUID phoneId,
    UUID simCardId
) {}

public record UpdateRequestRequest(
    RequestStatus status,
    String notes,
    BigDecimal fee  // null = no change; non-null admin-only
) {}

public record AddPartRequest(
    @NotBlank String description,
    @NotNull @DecimalMin("0.01") BigDecimal cost
) {}

public record RequestPartResponse(UUID id, String description, BigDecimal cost) {
    public static RequestPartResponse from(RequestPart p) {
        return new RequestPartResponse(p.getId(), p.getDescription(), p.getCost());
    }
}

public record AttachmentSummaryResponse(UUID id, UUID uploadedByUserId, Instant createdAt) {
    public static AttachmentSummaryResponse from(Attachment a) {
        return new AttachmentSummaryResponse(a.getId(), a.getUploadedBy(), a.getCreatedAt());
    }
}

public record RequestSummary(
    UUID id, UUID customerId, String customerName,
    RequestType type, RequestStatus status,
    RequestAuthor author,
    BigDecimal fee,     // nullable; admin-set directly on request
    Instant createdAt, Instant doneAt
) {}

public record RequestDetail(
    UUID id, UUID customerId, String customerName,
    RequestType type, RequestStatus status,
    RequestAuthor author,
    String notes,       // nullable
    BigDecimal fee,     // nullable; admin-set
    UUID phoneId, UUID simCardId,
    Instant createdAt, Instant updatedAt, Instant doneAt,
    List<RequestPartResponse> parts,
    List<AttachmentSummaryResponse> attachments,
    Long timeSpentMinutes   // null if not admin or not done
) {}
```

### 2. RequestService interface

`com.tetramobile.tetra.request.RequestService`:
```java
public interface RequestService {
    RequestDetail createRequest(CreateRequestRequest body, AuthenticatedUser caller);
    PagedResponse<RequestSummary> listRequests(RequestStatus status, RequestType type,
        UUID customerId, Pageable pageable, AuthenticatedUser caller);
    RequestDetail getRequest(UUID id, AuthenticatedUser caller);
    RequestDetail updateRequest(UUID id, UpdateRequestRequest body, AuthenticatedUser caller);
    RequestPartResponse addPart(UUID requestId, AddPartRequest body);
    void deletePart(UUID requestId, UUID partId);
}
```

### 3. RequestServiceImpl

`com.tetramobile.tetra.request.RequestServiceImpl`:

```java
@Service
@RequiredArgsConstructor
@Transactional
public class RequestServiceImpl implements RequestService {

    private final RequestRepository requestRepository;
    private final RequestPartRepository partRepository;
    private final AttachmentRepository attachmentRepository;
    private final CustomerRepository customerRepository;
    private final PhoneRepository phoneRepository;
    private final SimCardRepository simCardRepository;
    private final RequestQueryRepository requestQueryRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public RequestDetail createRequest(CreateRequestRequest body, AuthenticatedUser caller) {
        if (caller.isCustomer() && !body.customerId().equals(caller.customerId()))
            throw new ForbiddenException("forbidden", "Cannot submit request for another customer");

        Customer customer = customerRepository.findById(body.customerId())
            .orElseThrow(() -> new NotFoundException("customer_not_found", "Customer not found"));

        if (body.phoneId() != null &&
            !phoneRepository.existsByIdAndCustomerId(body.phoneId(), body.customerId()))
            throw new UnprocessableEntityException("invalid_phone", "Phone does not belong to customer");

        if (body.simCardId() != null &&
            !simCardRepository.existsByIdAndCustomerId(body.simCardId(), body.customerId()))
            throw new UnprocessableEntityException("invalid_sim", "SIM does not belong to customer");

        // author derived from caller role
        RequestAuthor author = caller.isCustomer() ? RequestAuthor.customer : RequestAuthor.company;

        Request request = new Request();
        request.setCustomerId(body.customerId());
        request.setType(body.type());
        request.setStatus(RequestStatus.submitted);
        request.setNotes(body.notes());
        request.setAuthor(author);
        request.setPhoneId(body.phoneId());
        request.setSimCardId(body.simCardId());
        requestRepository.save(request);

        eventPublisher.publishEvent(new RequestCreatedEvent(
            request.getId(), customer.getId(), request.getType(),
            author, customer.getWhatsappGroupId()
        ));

        return toDetail(request, customer.getName(), List.of(), List.of(), false);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<RequestSummary> listRequests(RequestStatus status, RequestType type,
            UUID customerId, Pageable pageable, AuthenticatedUser caller) {
        UUID effectiveCustomerId = caller.isCustomer() ? caller.customerId() : customerId;
        return requestQueryRepository.listRequests(status, type, effectiveCustomerId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public RequestDetail getRequest(UUID id, AuthenticatedUser caller) {
        Request request = findAndCheckAccess(id, caller);
        Customer customer = customerRepository.findById(request.getCustomerId()).orElseThrow();
        List<RequestPart> parts = partRepository.findByRequestId(id);
        List<Attachment> attachments = attachmentRepository.findByRequestId(id);
        boolean showTime = caller.isAdmin() && request.getDoneAt() != null;
        return toDetail(request, customer.getName(), parts, attachments, showTime);
    }

    @Override
    public RequestDetail updateRequest(UUID id, UpdateRequestRequest body, AuthenticatedUser caller) {
        SecurityUtils.requireAdminOrCompany();
        Request request = requestRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("request_not_found", "Request not found"));

        if (body.notes() != null) request.setNotes(body.notes());

        // fee update: admin only
        if (body.fee() != null) {
            SecurityUtils.requireAdmin();
            request.setFee(body.fee());
        }

        RequestStatus oldStatus = request.getStatus();
        if (body.status() != null && !body.status().equals(oldStatus)) {
            validateStatusTransition(oldStatus, body.status());
            request.setStatus(body.status());
            if (body.status() == RequestStatus.done) {
                request.setDoneAt(Instant.now());
            }
            Customer customer = customerRepository.findById(request.getCustomerId()).orElseThrow();
            eventPublisher.publishEvent(new RequestStatusChangedEvent(
                request.getId(), customer.getId(), oldStatus, body.status(),
                customer.getWhatsappGroupId()
            ));
        }

        requestRepository.save(request);
        Customer customer = customerRepository.findById(request.getCustomerId()).orElseThrow();
        List<RequestPart> parts = partRepository.findByRequestId(id);
        List<Attachment> attachments = attachmentRepository.findByRequestId(id);
        boolean showTime = caller.isAdmin() && request.getDoneAt() != null;
        return toDetail(request, customer.getName(), parts, attachments, showTime);
    }

    @Override
    public RequestPartResponse addPart(UUID requestId, AddPartRequest body) {
        SecurityUtils.requireAdmin();
        requestRepository.findById(requestId)
            .orElseThrow(() -> new NotFoundException("request_not_found", "Request not found"));
        RequestPart part = new RequestPart();
        part.setRequestId(requestId);
        part.setDescription(body.description());
        part.setCost(body.cost());
        return RequestPartResponse.from(partRepository.save(part));
    }

    @Override
    public void deletePart(UUID requestId, UUID partId) {
        SecurityUtils.requireAdmin();
        RequestPart part = partRepository.findById(partId)
            .filter(p -> p.getRequestId().equals(requestId))
            .orElseThrow(() -> new NotFoundException("part_not_found", "Part not found"));
        partRepository.delete(part);
    }

    // --- helpers ---

    private Request findAndCheckAccess(UUID id, AuthenticatedUser caller) {
        Request request = requestRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("request_not_found", "Request not found"));
        if (caller.isCustomer() && !request.getCustomerId().equals(caller.customerId()))
            throw new ForbiddenException("forbidden", "Access denied");
        return request;
    }

    private void validateStatusTransition(RequestStatus from, RequestStatus to) {
        boolean invalid = switch (from) {
            case submitted -> to == RequestStatus.submitted;
            case in_progress -> to == RequestStatus.submitted;
            case done -> true;
        };
        if (invalid)
            throw new UnprocessableEntityException("invalid_transition",
                "Cannot transition from " + from + " to " + to);
    }

    private RequestDetail toDetail(Request r, String customerName,
            List<RequestPart> parts, List<Attachment> attachments, boolean showTime) {
        Long timeSpent = null;
        if (showTime && r.getDoneAt() != null && r.getCreatedAt() != null) {
            timeSpent = Duration.between(r.getCreatedAt(), r.getDoneAt()).toMinutes();
        }
        return new RequestDetail(
            r.getId(), r.getCustomerId(), customerName,
            r.getType(), r.getStatus(), r.getAuthor(),
            r.getNotes(), r.getFee(),
            r.getPhoneId(), r.getSimCardId(),
            r.getCreatedAt(), r.getUpdatedAt(), r.getDoneAt(),
            parts.stream().map(RequestPartResponse::from).toList(),
            attachments.stream().map(AttachmentSummaryResponse::from).toList(),
            timeSpent
        );
    }
}
```

### 4. RequestQueryRepository (jOOQ)

`com.tetramobile.tetra.request.RequestQueryRepository`:

```java
@Repository
@RequiredArgsConstructor
public class RequestQueryRepository {

    private final DSLContext dsl;

    public PagedResponse<RequestSummary> listRequests(
            RequestStatus status, RequestType type,
            UUID customerId, Pageable pageable) {

        var r = REQUESTS.as("r");
        var c = CUSTOMERS.as("c");

        var query = dsl.select(
                r.ID, r.CUSTOMER_ID, c.NAME.as("customer_name"),
                r.TYPE, r.STATUS, r.AUTHOR, r.FEE, r.CREATED_AT, r.DONE_AT
            )
            .from(r)
            .join(c).on(c.ID.eq(r.CUSTOMER_ID));

        if (status != null) query = query.where(r.STATUS.eq(status.name()));
        if (type != null) query = query.where(r.TYPE.eq(type.name()));
        if (customerId != null) query = query.where(r.CUSTOMER_ID.eq(customerId));

        int total = dsl.fetchCount(query);
        var rows = query
            .orderBy(r.CREATED_AT.desc())
            .limit(pageable.getPageSize())
            .offset(pageable.getOffset())
            .fetch(rec -> new RequestSummary(
                rec.get(r.ID),
                rec.get(r.CUSTOMER_ID),
                rec.get("customer_name", String.class),
                RequestType.valueOf(rec.get(r.TYPE)),
                RequestStatus.valueOf(rec.get(r.STATUS)),
                RequestAuthor.valueOf(rec.get(r.AUTHOR)),
                rec.get(r.FEE),
                rec.get(r.CREATED_AT).toInstant(),
                rec.get(r.DONE_AT) != null ? rec.get(r.DONE_AT).toInstant() : null
            ));

        return PagedResponse.of(rows, total, pageable);
    }
}
```

### 5. Asset side-effect listener

`com.tetramobile.tetra.request.RequestAssetListener`:

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class RequestAssetListener {

    private final PhoneRepository phoneRepository;
    private final SimCardRepository simCardRepository;
    private final RequestRepository requestRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleStatusChanged(RequestStatusChangedEvent event) {
        if (event.newStatus() != RequestStatus.done) return;

        Request request = requestRepository.findById(event.requestId()).orElseThrow();

        switch (request.getType()) {
            case phone_repair -> {
                if (request.getPhoneId() != null) {
                    phoneRepository.findById(request.getPhoneId()).ifPresent(phone -> {
                        phone.setStatus(PhoneStatus.active);
                        phoneRepository.save(phone);
                    });
                }
            }
            case phone_replacement -> {
                if (request.getPhoneId() != null) {
                    phoneRepository.findById(request.getPhoneId()).ifPresent(old -> {
                        old.setStatus(PhoneStatus.replaced);
                        phoneRepository.save(old);
                    });
                }
                // model from notes (best-effort), ownership=company
                Phone newPhone = new Phone();
                newPhone.setCustomerId(request.getCustomerId());
                newPhone.setModel(request.getNotes() != null
                    ? request.getNotes() : "Replacement phone");
                newPhone.setOwnership(Ownership.company);
                newPhone.setStatus(PhoneStatus.active);
                phoneRepository.save(newPhone);
            }
            case new_sim -> {
                SimCard sim = new SimCard();
                sim.setCustomerId(request.getCustomerId());
                sim.setType(SimType.prepaid);
                sim.setStatus(SimStatus.active);
                sim.setBaseMonthlyfee(BigDecimal.ZERO);
                simCardRepository.save(sim);
            }
            default -> log.debug("No asset side-effect for type={}", request.getType());
        }
    }
}
```

### 6. Update cost breakdown in CustomerQueryRepository

Replace `request_fees: []` stub (plan-02) with live query in `getCostBreakdown`. Request fee = sum of `RequestPart.cost` for each done request:

```java
// request_fees — sum of part costs per done request in period
var requestFees = dsl
    .select(r.ID.as("request_id"), r.TYPE.as("request_type"),
        DSL.coalesce(DSL.sum(p.COST), BigDecimal.ZERO).as("amount"))
    .from(r)
    .leftJoin(p).on(p.REQUEST_ID.eq(r.ID))
    .where(r.CUSTOMER_ID.eq(customerId)
        .and(r.STATUS.eq("done"))
        .and(DSL.month(r.DONE_AT).eq(month))
        .and(DSL.year(r.DONE_AT).eq(year)))
    .groupBy(r.ID, r.TYPE)
    .fetch(rec -> new RequestFeeItem(
        rec.get("request_id", UUID.class),
        rec.get("request_type", String.class),
        rec.get("amount", BigDecimal.class)
    ));
```

### 7. RequestController

`com.tetramobile.tetra.request.RequestController`:

```java
@RestController
@RequestMapping("/api/v1/requests")
@RequiredArgsConstructor
public class RequestController {

    private final RequestService requestService;

    @PostMapping
    public ResponseEntity<RequestDetail> create(@RequestBody @Valid CreateRequestRequest body) {
        return ResponseEntity.status(201)
            .body(requestService.createRequest(body, SecurityUtils.currentUser()));
    }

    @GetMapping
    public ResponseEntity<PagedResponse<RequestSummary>> list(
            @RequestParam(required = false) RequestStatus status,
            @RequestParam(required = false) RequestType type,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") @Max(100) int size) {
        return ResponseEntity.ok(requestService.listRequests(
            status, type, customerId,
            PageRequest.of(page, size),
            SecurityUtils.currentUser()
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequestDetail> get(@PathVariable UUID id) {
        return ResponseEntity.ok(requestService.getRequest(id, SecurityUtils.currentUser()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<RequestDetail> update(
            @PathVariable UUID id,
            @RequestBody @Valid UpdateRequestRequest body) {
        return ResponseEntity.ok(requestService.updateRequest(id, body, SecurityUtils.currentUser()));
    }

    @PostMapping("/{id}/parts")
    public ResponseEntity<RequestPartResponse> addPart(
            @PathVariable UUID id,
            @RequestBody @Valid AddPartRequest body) {
        return ResponseEntity.status(201).body(requestService.addPart(id, body));
    }

    @DeleteMapping("/{id}/parts/{partId}")
    public ResponseEntity<Void> deletePart(@PathVariable UUID id, @PathVariable UUID partId) {
        requestService.deletePart(id, partId);
        return ResponseEntity.noContent().build();
    }
}
```

---

## Integration tests

`RequestServiceIT`:
- Admin creates phone_repair request for customer → status=submitted, author=company, 201
- Customer creates request for own customer_id → 201, author=customer
- Customer tries request for different customer_id → 403
- Admin patches status submitted→in_progress → 200, notes update works
- Admin patches status in_progress→done → done_at set, time_spent_minutes populated
- Admin patches done→submitted → 422 invalid_transition
- Admin sets fee → 200, fee persisted; company tries to set fee → 403
- `GET /requests?customer_id={id}` returns only that customer's requests
- Customer calls `GET /requests` → only sees own requests
- Admin adds part (`description`, `cost`) → returned in GET /requests/{id} parts list
- phone_repair done → phone.status = active
- phone_replacement done → old phone.status = replaced, new phone appears

---

## Acceptance criteria

- [ ] `POST /requests` creates with `notes` field (not `description`); `author` auto-set from caller role
- [ ] `GET /requests` customer-scoped correctly; RequestSummary has `fee` (not `total_fee`)
- [ ] `PATCH /requests/{id}` accepts `notes`, `fee` (admin only), `status`
- [ ] Parts use `description`/`cost` fields
- [ ] `RequestDetail.attachments` array present (may be empty)
- [ ] Asset side-effects fire in new transaction after commit
- [ ] `./mvnw test -Dtest=RequestServiceIT` passes

## Automated checks

```bash
cd api
./mvnw test -Dtest=RequestServiceIT
./mvnw verify
```
