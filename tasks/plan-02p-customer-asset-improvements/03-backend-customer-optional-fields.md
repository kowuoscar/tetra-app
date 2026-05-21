# Task 03 — Backend: Customer optional contact fields

## Domain
backend

## Plan
`plans/plan-02p-customer-asset-improvements.md`

## Depends on
- `tasks/plan-02-customers-assets/00-backend-customer-entity.md` — Customer entity and CreateCustomerRequest must exist

## References
- `docs/contracts.md#POST /customers` — `contact_info` and `whatsapp_group_id` removed from `required`
- `specs/backend.md#Customer rules` — both fields optional; WhatsApp notifications simply cannot fire until `whatsapp_group_id` is set

## Drift context

From `docs/drift-report.md` (Intentional changes):
- `POST /customers` `required` array previously included `contact_info` and `whatsapp_group_id` — these are removed; only `name` is required
- `CreateCustomerRequest.java` previously had `@NotBlank` on both `contactInfo` and `whatsappGroupId` — these annotations are removed

The DB schema (`customers` table in V1 migration) already has both as nullable VARCHAR — no migration needed.

## Context

`CreateCustomerRequest.java` has `@NotBlank` on `contactInfo` and `whatsappGroupId`. This was an over-constraint — the DB allows both to be null, and the product requires admin to be able to create a customer before having those details. Remove `@NotBlank` from both fields. The `name` field retains its `@NotBlank`. No other changes needed — the `Customer` entity fields are already nullable.

### Inlined spec excerpts

**POST /customers contract (updated):**
```
POST /customers
Auth required: yes (admin only)
Request body:
{
  "name": string,              // required (@NotBlank)
  "contact_info": string|null, // optional (nullable)
  "whatsapp_group_id": string|null  // optional (nullable)
}
Error responses:
  422 — name is blank or missing
  403 — caller is not admin
```

**Business rules:**
- `name` is the only required field at creation time
- `contact_info` and `whatsapp_group_id` can be set later via `PATCH /customers/{id}`
- WhatsApp notifications for this customer will not fire until `whatsapp_group_id` is populated — this is acceptable and handled by the fire-and-forget notification logic (logs at INFO when group ID is null)

## Implementation

1. Open `api/src/main/java/com/tetramobile/tetra/customer/dto/CreateCustomerRequest.java`.

2. Remove `@NotBlank` from the `contactInfo` field. Keep the field itself — it remains part of the record.

3. Remove `@NotBlank` from the `whatsappGroupId` field. Keep the field itself.

4. The record should look like:
   ```java
   public record CreateCustomerRequest(
       @NotBlank String name,
       String contactInfo,
       String whatsappGroupId
   ) {}
   ```

5. Verify `CustomerService.createCustomer()` already handles null `contactInfo` and null `whatsappGroupId` when mapping to the entity (null is stored as NULL in the DB column). If it calls `.trim()` or similar on these fields without null-checking, add a null guard.

6. No migration needed — `customers.contact_info` and `customers.whatsapp_group_id` are already nullable in V1.

## Acceptance criteria

- [ ] `POST /customers` with `{ "name": "Test Corp" }` → 201 created (no contact_info or whatsapp_group_id)
- [ ] `POST /customers` with `{ "name": "", "contact_info": "..." }` → 422 (name blank)
- [ ] `POST /customers` with `{ "name": "Test", "contact_info": null, "whatsapp_group_id": null }` → 201 created
- [ ] Created customer record has `contact_info = NULL` and `whatsapp_group_id = NULL` in DB
- [ ] All automated checks pass

## Automated checks

```bash
cd api && ./mvnw verify -q
```
