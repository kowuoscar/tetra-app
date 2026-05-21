# Task 07 — Frontend: CreateSimCardModal and EditSimCardModal — provider, number, conditional fee

## Domain
frontend

## Plan
`plans/plan-02p-customer-asset-improvements.md`

## Depends on
- `tasks/plan-02p-customer-asset-improvements/02-backend-simcard-provider-number.md` — backend must accept `provider` and `number`
- `tasks/plan-02p-customer-asset-improvements/05-frontend-types-update.md` — `SimCardSummary` must have `provider` and `number` typed
- `tasks/plan-02p-customer-asset-improvements/04-frontend-badge-rebuild.md` — `StatusBadge` must be available (used in SIM card status display in the same file)

## References
- `docs/contracts.md#POST /customers/{id}/sim-cards` — required: type, provider, number, base_monthly_fee
- `docs/contracts.md#PATCH /sim-cards/{id}` — provider, number optional on patch
- `specs/frontend.md#CreateSimCardModal / EditSimCardModal (updated)` — full component spec
- `design/preview.html#plan02p-forms` — visual reference: postpaid vs prepaid form states

## Context

`CreateSimCardModal` currently has only `type`, `base_monthly_fee`, and `phone_id` fields. It must gain `provider` (select) and `number` (text with FR mobile validation). The fee field must be hidden and auto-set to `0` when `type = prepaid`. `EditSimCardModal` (if it exists) must be updated with the same fields, pre-populated from the existing SIM record. All fields require client-side validation before the API is called.

### Inlined spec excerpts

**Provider options (in display order):**
```
Free | Orange | Bouygues | SFR | Coriolis
(values sent to API: FREE | ORANGE | BOUYGUES | SFR | CORIOLIS)
```

**FR mobile number validation (client-side):**
```
Pattern:  /^(\+33|0033|0)[67]\d{8}$/
Accepts:  06 12 34 56 78  (with or without spaces, after stripping spaces)
          +33 6 12 34 56 78
          0033612345678
Rejects:  01 23 45 67 89 (landline)
          07123 (too short)
          +44 7911 123456 (non-FR)
Error message: "Must be a French mobile number (06 or 07 prefix)"
```

**Prepaid fee behaviour:**
```
When type = 'prepaid':
  - Hide the base_monthly_fee input
  - Show info message: "Prepaid SIMs have no monthly fee. €0.00 will be recorded automatically."
  - Submit base_monthly_fee: 0 in the API call
When type = 'postpaid':
  - Show base_monthly_fee input (required, >= 0)
```

**Form validation rules:**
```
type:              required
provider:          required — "Provider is required"
number:            required, matches FR pattern — "Must be a French mobile number (06 or 07 prefix)"
base_monthly_fee:  required when postpaid, must be >= 0 — "Monthly fee must be 0 or greater"
phone_id:          optional
```

**Number normalisation before sending:**
Strip all spaces, dashes, dots from the number string before submitting to API.
Example: "06 12 34 56 78" → "0612345678"

## Implementation

1. Read `web/src/components/features/customers/CustomerSimCardsTab.tsx` to locate `CreateSimCardModal` and any `EditSimCardModal`.

2. In `CreateSimCardModal`, add the `provider` select field between `type` and `base_monthly_fee`:
   ```tsx
   <div>
     <label>Provider <span className="text-status-error">*</span></label>
     <select value={provider} onChange={e => setProvider(e.target.value)}>
       <option value="">Select provider…</option>
       <option value="FREE">Free</option>
       <option value="ORANGE">Orange</option>
       <option value="BOUYGUES">Bouygues</option>
       <option value="SFR">SFR</option>
       <option value="CORIOLIS">Coriolis</option>
     </select>
     {errors.provider && <p className="text-status-error text-xs mt-1">{errors.provider}</p>}
   </div>
   ```

3. Add the `number` field after `provider`:
   ```tsx
   <div>
     <label>Mobile number <span className="text-status-error">*</span></label>
     <input
       type="tel"
       value={number}
       onChange={e => setNumber(e.target.value)}
       placeholder="06 or 07 — e.g. 06 12 34 56 78"
     />
     {errors.number && <p className="text-status-error text-xs mt-1">{errors.number}</p>}
   </div>
   ```

4. Make `base_monthly_fee` conditional:
   - When `type === 'prepaid'`: hide the fee input; show the info message `"Prepaid SIMs have no monthly fee. €0.00 will be recorded automatically."` in a muted info box.
   - When `type === 'postpaid'`: show the fee input as before (required).

5. Add a validate function called on submit before the API call:
   ```
   if (!provider) → errors.provider = "Provider is required"
   if (!number.trim()) → errors.number = "Mobile number is required"
   else if (!isFrMobile(normalise(number))) → errors.number = "Must be a French mobile number (06 or 07 prefix)"
   if (type === 'postpaid' && (fee === '' || fee < 0)) → errors.fee = "Monthly fee must be 0 or greater"
   ```
   Where:
   ```typescript
   function normalise(n: string): string {
     return n.replace(/[\s.\-]/g, '')
   }
   function isFrMobile(n: string): boolean {
     return /^(\+33|0033|0)[67]\d{8}$/.test(n)
   }
   ```

6. On submit, send `base_monthly_fee: 0` when `type === 'prepaid'` regardless of the fee field state.

7. Send `number` as the normalised value (spaces stripped).

8. In `EditSimCardModal`, pre-populate `provider` and `number` from the existing `SimCardSummary` record. Apply the same conditional fee logic and same validations.

## Acceptance criteria

- [ ] `CreateSimCardModal` shows provider select and mobile number field
- [ ] Submitting without provider → inline error "Provider is required"
- [ ] Submitting with `number = "01 23 45 67 89"` → inline error "Must be a French mobile number (06 or 07 prefix)"
- [ ] With `type = prepaid`: fee input hidden, info message shown, `base_monthly_fee: 0` sent
- [ ] With `type = postpaid`: fee input shown, required
- [ ] Number "06 12 34 56 78" normalised to "0612345678" before API call
- [ ] `EditSimCardModal` pre-fills provider and number from existing SIM
- [ ] API not called until all validations pass
- [ ] `pnpm tsc --noEmit` passes
- [ ] All automated checks pass

## Automated checks

```bash
cd web && pnpm tsc --noEmit && pnpm build
```
