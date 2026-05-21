# Drift report

**Generated:** 2026-05-21
**Feature being added:** Customer & Asset Improvements
**Scan scope:**
- `web/src/components/features/customers/`
- `web/src/components/ui/badge.tsx`
- `web/src/types/index.ts`
- `api/src/main/java/com/tetramobile/tetra/simcard/`
- `api/src/main/java/com/tetramobile/tetra/customer/dto/`
- `api/src/main/resources/db/migration/`

---

## Summary

| Type | Count | Files affected |
|------|-------|---------------|
| A — Addition (in code, not in specs) | 2 | `specs/frontend.md` |
| B — Modification (code differs from specs) | 2 | `specs/frontend.md` |
| C — Deletion (in specs, not in code) | 2 | `specs/frontend.md` |
| D — Ambiguous (resolved with user input) | 0 | — |

---

## Type A — Addition drift

### AssignSimModal
- **Found in:** `web/src/components/features/customers/CustomerPhonesTab.tsx`
- **Missing from:** `specs/frontend.md#component-inventory`
- **Added to spec:** `specs/frontend.md#AssignSimModal` — component for assigning an unassigned SIM card to a phone from the Phones tab

### AssignPhoneModal
- **Found in:** `web/src/components/features/customers/CustomerSimCardsTab.tsx`
- **Missing from:** `specs/frontend.md#component-inventory`
- **Added to spec:** `specs/frontend.md#AssignPhoneModal` — component for assigning a phone to a SIM card from the SIM Cards tab

---

## Type B — Modification drift

### StatusBadge / badge.tsx
- **Found in:** `web/src/components/ui/badge.tsx`
- **Spec said:** Component with `success`, `warning`, `error`, `info`, `neutral` variants and 6px dot indicator
- **Code has:** Base UI `useRender`/`mergeProps`-based component with `default`, `secondary`, `destructive`, `outline`, `ghost`, `link` variants — no dot, no semantic status variants. Tabs use an inline `StatusPill` workaround.
- **Spec updated:** `specs/frontend.md#StatusBadge` — noted dot indicator requirement and that component needs rebuild; tabs currently use `StatusPill` workaround

### EditPhoneModal — replaced status option
- **Found in:** `web/src/components/features/customers/CustomerPhonesTab.tsx` lines 293-297
- **Spec said:** Valid `PATCH /phones/{id}` transitions are `active ↔ in_repair` only; `replaced` cannot be set via PATCH (422 error)
- **Code has:** `EditPhoneModal` renders `<option value="replaced">Replaced</option>` as selectable — backend will reject it with 422
- **Spec updated:** `specs/frontend.md#CreatePhoneModal / EditPhoneModal` — added known bug annotation

---

## Type C — Deletion drift

### CustomerRequestsTab content
- **In spec:** `specs/frontend.md#Customer Detail` — `CustomerRequestsTab` component using `GET /requests?customer_id={id}`
- **Not found in:** `web/src/components/features/customers/CustomerDetailView.tsx` — tab renders `<p>Requests coming in plan-03.</p>`
- **Action:** Marked as `⚠️ NOT YET IMPLEMENTED` in spec

### CustomerTimeTrackingTab content
- **In spec:** `specs/frontend.md#Customer Detail` — `CustomerTimeTrackingTab` component (admin only)
- **Not found in:** `web/src/components/features/customers/CustomerDetailView.tsx` — tab renders `<p>Time tracking coming in plan-03.</p>`
- **Action:** Marked as `⚠️ NOT YET IMPLEMENTED` in spec

---

## Type D — Ambiguous drift (resolved)

None.

---

## Intentional changes

| Change | File | Confirmed by user | Reason |
|--------|------|------------------|--------|
| `POST /customers` `required` array relaxed — `contact_info` and `whatsapp_group_id` removed from required | `docs/contracts.md` | Yes (feature interview) | DB schema has both as nullable VARCHAR; admin may not have contact info at customer creation time |
| `CreateCustomerRequest.java` `@NotBlank` removed from `contactInfo` and `whatsappGroupId` | `api/.../CreateCustomerRequest.java` | Yes (feature interview) | Aligns backend validation with nullable DB schema |

---

## Spec files modified

| File | Changes | Lines affected |
|------|---------|---------------|
| `specs/frontend.md` | 2 additions (AssignSimModal, AssignPhoneModal), 2 modifications (StatusBadge description + dot, EditPhoneModal bug note), 2 marked not-implemented (CustomerRequestsTab, CustomerTimeTrackingTab) | ~596-631, ~67, ~1015, ~1038+ |
