# Task 02 — Backend: SimCard provider and number fields

## Domain
backend

## Plan
`plans/plan-02p-customer-asset-improvements.md`

## Depends on
- `tasks/plan-02p-customer-asset-improvements/01-backend-migration-sim-card-fields.md` — DB columns must exist before the entity and DTOs reference them

## References
- `docs/contracts.md#POST /customers/{id}/sim-cards` — `provider` and `number` added to `required`
- `docs/contracts.md#PATCH /sim-cards/{id}` — `provider` and `number` added as optional patch fields
- `docs/contracts.md#SimCardSummary` — `provider` (nullable enum) and `number` (nullable string) added
- `docs/contracts.md#PhoneSummary` — `sim_card` embedded object gains `provider` and `number`
- `specs/backend.md#SIM card rules` — provider enum values, FR number pattern, 422 error codes

## Context

Extend the SimCard backend to carry provider and number. A new `SimProvider` Java enum must be created. The `SimCard` JPA entity gets two new nullable fields. Both `CreateSimCardRequest` and `UpdateSimCardRequest` DTOs gain the fields (required on create, optional on patch). The jOOQ aggregation queries that project `SimCardSummary` and the embedded `sim_card` object inside `PhoneSummary` must include the new fields in their SELECT. Run `./mvnw generate-sources` first so jOOQ DSL classes reflect the V3 migration columns.

### Inlined spec excerpts

**SimProvider enum values:**
```
FREE, ORANGE, BOUYGUES, SFR, CORIOLIS
```

**FR mobile number pattern:**
```
^(\+33|0033|0)[67]\d{8}$
```
Mobile-only: 06/07 prefix (landlines are not valid here). Error code on failure: `invalid_phone_number` (422).

**CreateSimCardRequest contract:**
```
POST /customers/{id}/sim-cards
Auth required: yes (admin only)
Request body:
{
  "type": "prepaid" | "postpaid",           // required
  "provider": "FREE|ORANGE|BOUYGUES|SFR|CORIOLIS",  // required
  "number": string,                          // required, FR mobile pattern
  "base_monthly_fee": number (>= 0),         // required (send 0 for prepaid)
  "phone_id": uuid | null                    // optional
}
Error responses:
  422 invalid_phone_number — number fails FR mobile pattern
  422 validation_error    — missing required field
  404                     — customer not found
  403                     — caller is not admin
```

**UpdateSimCardRequest contract (PATCH /sim-cards/{id}):**
```
All fields optional:
  "type", "provider", "number", "base_monthly_fee", "phone_id", "status"
Same 422 invalid_phone_number if number is present but invalid.
```

**SimCardSummary response shape:**
```json
{
  "id": "uuid",
  "type": "prepaid|postpaid",
  "provider": "FREE|ORANGE|BOUYGUES|SFR|CORIOLIS|null",
  "number": "string|null",
  "base_monthly_fee": "number",
  "phone_id": "uuid|null",
  "status": "active|unassigned|cancelled",
  "created_at": "ISO8601"
}
```

**PhoneSummary.sim_card embedded object:**
```json
{
  "id": "uuid",
  "type": "prepaid|postpaid",
  "provider": "FREE|ORANGE|BOUYGUES|SFR|CORIOLIS|null",
  "number": "string|null",
  "base_monthly_fee": "number"
}
```

**Business rules:**
- `provider` required at POST — `@NotNull SimProvider provider` on CreateSimCardRequest
- `number` required at POST — `@NotBlank @Pattern(regexp = "^(\\+33|0033|0)[67]\\d{8}$") String number`
- `base_monthly_fee` = 0 accepted for prepaid SIMs (existing `@DecimalMin("0")` already permits this)
- On PATCH, if `number` is provided, apply the same pattern validation

## Implementation

1. Run jOOQ codegen first:
   ```bash
   cd api && ./mvnw generate-sources -pl .
   ```

2. Create `api/src/main/java/com/tetramobile/tetra/simcard/model/SimProvider.java`:
   ```java
   package com.tetramobile.tetra.simcard.model;

   public enum SimProvider {
       FREE, ORANGE, BOUYGUES, SFR, CORIOLIS
   }
   ```

3. In `SimCard.java` (JPA entity), add two new nullable fields:
   ```java
   @Enumerated(EnumType.STRING)
   @Column(name = "provider")
   private SimProvider provider;

   @Column(name = "number")
   private String number;
   ```
   Add getters/setters (or use Lombok if already used in the entity).

4. In `CreateSimCardRequest.java`, add:
   ```java
   @NotNull
   SimProvider provider,

   @NotBlank
   @Pattern(regexp = "^(\\+33|0033|0)[67]\\d{8}$", message = "invalid_phone_number")
   String number,
   ```

5. In `UpdateSimCardRequest.java` (or equivalent patch DTO), add optional fields:
   ```java
   SimProvider provider,  // nullable — not annotated
   @Pattern(regexp = "^(\\+33|0033|0)[67]\\d{8}$", message = "invalid_phone_number")
   String number,         // nullable — annotation only fires when non-null
   ```

6. In `SimCardService.java`, propagate the new fields in `createSimCard()` and `updateSimCard()`:
   - On create: `simCard.setProvider(request.provider()); simCard.setNumber(request.number());`
   - On patch: if `request.provider() != null` then update; same for `number`

7. In the jOOQ query that builds `SimCardSummary` (likely in `SimCardQueryRepository` or `CustomerQueryRepository`), add `SIM_CARDS.PROVIDER` and `SIM_CARDS.NUMBER` to the SELECT and map them into the DTO.

8. In the jOOQ query that builds the embedded `sim_card` object inside `PhoneSummary`, add `SIM_CARDS.PROVIDER` and `SIM_CARDS.NUMBER` to the SELECT.

9. Add `provider` and `number` fields to `SimCardSummary.java` DTO record/class.

10. Ensure `@Valid` is present on the request body parameter in `SimCardController` for both POST and PATCH endpoints.

## Acceptance criteria

- [ ] `SimProvider` enum exists with `FREE, ORANGE, BOUYGUES, SFR, CORIOLIS`
- [ ] `POST /customers/{id}/sim-cards` without `provider` → 422 validation error
- [ ] `POST /customers/{id}/sim-cards` without `number` → 422 validation error
- [ ] `POST /customers/{id}/sim-cards` with `number = "01 23 45 67 89"` → 422 `invalid_phone_number`
- [ ] `POST /customers/{id}/sim-cards` with `number = "06 12 34 56 78"` → 201 created
- [ ] `GET /customers/{id}` phones list — each phone's embedded `sim_card` includes `provider` and `number`
- [ ] `GET /customers/{id}/sim-cards` list — each SIM includes `provider` and `number`
- [ ] `PATCH /sim-cards/{id}` with `{ "number": "bad" }` → 422 `invalid_phone_number`
- [ ] `PATCH /sim-cards/{id}` with `{ "provider": "ORANGE" }` → 200 updated
- [ ] All automated checks pass

## Automated checks

```bash
cd api && ./mvnw verify -q
```
