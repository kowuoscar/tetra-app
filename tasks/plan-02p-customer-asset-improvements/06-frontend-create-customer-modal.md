# Task 06 — Frontend: CreateCustomerModal optional fields and form validation

## Domain
frontend

## Plan
`plans/plan-02p-customer-asset-improvements.md`

## Depends on
- `tasks/plan-02p-customer-asset-improvements/03-backend-customer-optional-fields.md` — backend must accept `POST /customers` with only `name` before the frontend omits the other fields
- `tasks/plan-02p-customer-asset-improvements/04-frontend-badge-rebuild.md` — `StatusBadge` must exist; this task may use it in the modal success state or nearby UI

## References
- `docs/contracts.md#POST /customers` — only `name` is required
- `docs/contracts.md#PATCH /customers/{id}` — to confirm contact/WhatsApp can be edited later
- `specs/frontend.md#CreateCustomerModal` — form field spec, optional labelling, validation rules
- `design/preview.html#plan02p-forms` — visual reference: CreateCustomerModal with optional labels

## Context

`CreateCustomerModal` currently marks all three fields (`name`, `contact_info`, `whatsapp_group_id`) as required with HTML `required` attributes and submit-time checks. After task 03, the backend only requires `name`. The frontend must: (1) remove the required constraint from `contact_info` and `whatsapp_group_id`, (2) label them as optional, (3) add client-side validation for `name` (cannot be blank). Also tighten validation across `EditCustomerModal` (if it exists) with the same rules.

### Inlined spec excerpts

**Validation rules for customer forms:**
```
name:              required, non-blank, max 255 chars
contact_info:      optional — if provided, non-blank (no whitespace-only string)
whatsapp_group_id: optional — if provided, non-blank
```

**Form field labelling:**
```
"Company name *"      — required indicator
"Contact info (optional)"
"WhatsApp group ID (optional)"
```

**Inline error messages:**
```
name blank:          "Company name is required"
contact_info blank:  "Contact info cannot be empty — leave blank to skip"
whatsapp blank:      "WhatsApp group ID cannot be empty — leave blank to skip"
```

**Behaviour on submit:**
1. Validate all fields client-side before calling the API
2. If validation fails, show inline error below the field — do NOT show a toast
3. Only call `POST /customers` when all validations pass
4. On API error (422/500), show error toast via existing toast mechanism
5. On success, close modal and refetch customer list

## Implementation

1. Read `web/src/components/features/customers/CreateCustomerModal.tsx`.

2. Remove `required` HTML attribute from the `contact_info` and `whatsapp_group_id` inputs.

3. Update the label text:
   - `contact_info` label → `"Contact info"` with an `(optional)` span in muted text
   - `whatsapp_group_id` label → `"WhatsApp group ID"` with an `(optional)` span in muted text

4. Add client-side validation logic (run on submit, before API call):
   - `name`: trim → if empty, set field error "Company name is required" and abort
   - `contact_info`: if non-empty, trim → if result is empty, set field error "Contact info cannot be empty — leave blank to skip"
   - `whatsapp_group_id`: same pattern as `contact_info`

5. On submit, send `contact_info` only if non-empty; same for `whatsapp_group_id`. Do not send empty strings — omit the fields entirely or send `null`.

6. Check if an `EditCustomerModal` (or inline edit form for customers) exists. If so, apply the same optional labelling and validation rules there.

7. Verify `CreateCustomerModal` form state resets when the modal is closed and reopened (no stale field errors).

## Acceptance criteria

- [ ] `CreateCustomerModal` submits successfully with only `name` filled
- [ ] `contact_info` and `whatsapp_group_id` show `(optional)` label text
- [ ] Submitting with an empty `name` shows inline error "Company name is required" without calling the API
- [ ] Submitting with `contact_info = "   "` (whitespace only) shows inline error
- [ ] API is not called until all client-side validations pass
- [ ] Successful creation closes the modal and refreshes the customer list
- [ ] `pnpm tsc --noEmit` passes
- [ ] All automated checks pass

## Automated checks

```bash
cd web && pnpm tsc --noEmit && pnpm build
```
