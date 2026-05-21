# Task 08 — Frontend: CustomerPhonesTab — enriched SIM column and Unassign SIM button

## Domain
frontend

## Plan
`plans/plan-02p-customer-asset-improvements.md`

## Depends on
- `tasks/plan-02p-customer-asset-improvements/02-backend-simcard-provider-number.md` — `GET /customers/{id}` phones list must return `provider` and `number` in the embedded `sim_card` object
- `tasks/plan-02p-customer-asset-improvements/05-frontend-types-update.md` — `PhoneSummary.sim_card.provider` and `PhoneSummary.sim_card.number` must be typed
- `tasks/plan-02p-customer-asset-improvements/04-frontend-badge-rebuild.md` — `StatusBadge` must be available (used in the same tab for phone status)

## References
- `docs/contracts.md#PATCH /sim-cards/{id}` — `{ phone_id: null }` unassigns the SIM
- `specs/frontend.md#CustomerPhonesTab — SIM column and Unassign button (updated)` — full component spec
- `design/preview.html#plan02p-phones-sim` — visual reference: enriched column + Unassign SIM button

## Context

`CustomerPhonesTab` displays phones in a table. The SIM Card column currently shows only `type · €X.XX/mo`. It must show `Provider · Number · type` and append ` · €X.XX/mo` only for postpaid. Rows where the phone has an assigned SIM must show an "Unassign SIM" button. The unassign action sends `PATCH /sim-cards/{sim.id}` with `{ phone_id: null }` and refreshes the tab. The existing "Assign SIM" button must remain on rows with no SIM.

### Inlined spec excerpts

**SIM column display format:**
```
Phone has SIM, postpaid:  "{Provider} · {Number} · postpaid · €{fee}/mo"
Phone has SIM, prepaid:   "{Provider} · {Number} · prepaid"
Phone has no SIM:         "—"

Provider display name mapping:
  FREE      → "Free"
  ORANGE    → "Orange"
  BOUYGUES  → "Bouygues"
  SFR       → "SFR"
  CORIOLIS  → "Coriolis"

Number display: show as stored (e.g. "0612345678" or "+33612345678")
Fee display: "€{base_monthly_fee.toFixed(2)}/mo" — only for postpaid
```

**Unassign SIM action:**
```
PATCH /sim-cards/{sim_card_id}
Body: { "phone_id": null }
Auth: admin only
On success: refetch phones tab data (invalidate query)
On error: show error toast
Confirmation: no confirmation dialog — action is reversible (admin can re-assign)
```

**Button layout (per phone row — actions column):**
```
Phone with assigned SIM:    [Unassign SIM] [Edit]
Phone with no SIM:          [Assign SIM]  [Edit]
```
"Unassign SIM" uses a destructive/danger variant (matches `btn-destructive` style or `StatusBadge error` background).

**Unassign SIM — side effect:**
After the PATCH, the SIM card's status transitions to `unassigned` on the server (handled by existing SimCardService logic). The client only needs to refetch.

## Implementation

1. Read `web/src/components/features/customers/CustomerPhonesTab.tsx` to understand the current table structure and `AssignSimModal` implementation.

2. Add a helper function to format the SIM column text:
   ```typescript
   const PROVIDER_LABELS: Record<string, string> = {
     FREE: 'Free', ORANGE: 'Orange', BOUYGUES: 'Bouygues', SFR: 'SFR', CORIOLIS: 'Coriolis',
   }

   function formatSimColumn(sim: PhoneSummary['sim_card']): string {
     if (!sim) return '—'
     const provider = sim.provider ? PROVIDER_LABELS[sim.provider] ?? sim.provider : '—'
     const number   = sim.number ?? '—'
     const type     = sim.type
     const fee      = sim.type === 'postpaid' ? ` · €${sim.base_monthly_fee.toFixed(2)}/mo` : ''
     return `${provider} · ${number} · ${type}${fee}`
   }
   ```

3. In the phones table, replace the SIM Card column cell content:
   ```tsx
   <td>
     {phone.sim_card
       ? <span className="font-mono text-xs">{formatSimColumn(phone.sim_card)}</span>
       : <span className="text-text-disabled">—</span>
     }
   </td>
   ```

4. In the actions column, add the "Unassign SIM" button for phones that have a SIM:
   ```tsx
   <td>
     {phone.sim_card && (
       <button
         onClick={() => handleUnassignSim(phone.sim_card!.id)}
         className="... destructive/danger style ..."
         disabled={unassigning}
       >
         Unassign SIM
       </button>
     )}
     {!phone.sim_card && (
       <button onClick={() => openAssignSim(phone.id)}>Assign SIM</button>
     )}
     <button onClick={() => openEdit(phone)}>Edit</button>
   </td>
   ```

5. Add the `handleUnassignSim` function:
   ```typescript
   async function handleUnassignSim(simId: string) {
     try {
       await updateSimCard(simId, { phone_id: null })
       // invalidate / refetch phones query
     } catch {
       // show error toast
     }
   }
   ```
   Use the existing `updateSimCard` API client function (from `src/lib/api/client.ts` or similar) that calls `PATCH /sim-cards/{id}`.

6. Verify the TanStack Query invalidation refreshes the phones list correctly after both assign and unassign.

7. Verify the `AssignSimModal` still works — it uses `updateSimCard(simId, { phone_id: phone.id })` which remains unchanged.

## Acceptance criteria

- [ ] Phone with postpaid SIM shows `Orange · 0612345678 · postpaid · €89.00/mo` in the SIM column
- [ ] Phone with prepaid SIM shows `Free · 0798765432 · prepaid` (no fee)
- [ ] Phone with no SIM shows `—`
- [ ] Phone with SIM: "Unassign SIM" button appears in actions column
- [ ] Phone with no SIM: "Assign SIM" button appears (existing behaviour preserved)
- [ ] Clicking "Unassign SIM" sends `PATCH /sim-cards/{id}` with `{ phone_id: null }` and refreshes the tab
- [ ] After unassign, the phone row shows `—` and "Assign SIM" button
- [ ] `AssignSimModal` still works correctly
- [ ] `pnpm tsc --noEmit` passes
- [ ] All automated checks pass

## Automated checks

```bash
cd web && pnpm tsc --noEmit && pnpm build
```
