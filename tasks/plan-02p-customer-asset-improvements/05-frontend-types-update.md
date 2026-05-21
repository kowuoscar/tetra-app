# Task 05 — Frontend: TypeScript types — SimCardSummary and PhoneSummary

## Domain
frontend

## Plan
`plans/plan-02p-customer-asset-improvements.md`

## Depends on
- `tasks/plan-02p-customer-asset-improvements/02-backend-simcard-provider-number.md` — backend must return `provider` and `number` in API responses before frontend types reflect them

## References
- `docs/contracts.md#SimCardSummary` — added `provider` (nullable enum string) and `number` (nullable string)
- `docs/contracts.md#PhoneSummary` — embedded `sim_card` object gains `provider` and `number`
- `web/src/types/index.ts` — all shared types live here

## Context

`web/src/types/index.ts` defines `SimCardSummary` and `PhoneSummary`. Both lack `provider` and `number` after the plan-02 implementation. The backend now returns these fields from task 02. This task updates the TypeScript types so downstream components can access the fields. Do not add any component logic here — that belongs in tasks 07 and 08.

### Inlined spec excerpts

**Updated SimCardSummary type:**
```typescript
interface SimCardSummary {
  id: string
  type: 'prepaid' | 'postpaid'
  provider: 'FREE' | 'ORANGE' | 'BOUYGUES' | 'SFR' | 'CORIOLIS' | null
  number: string | null
  base_monthly_fee: number
  phone_id: string | null
  status: 'active' | 'unassigned' | 'cancelled'
  created_at: string
}
```

**Updated PhoneSummary.sim_card inline type:**
```typescript
sim_card: {
  id: string
  type: 'prepaid' | 'postpaid'
  provider: 'FREE' | 'ORANGE' | 'BOUYGUES' | 'SFR' | 'CORIOLIS' | null
  number: string | null
  base_monthly_fee: number
} | null
```

**SimProvider union type to export (for use in forms):**
```typescript
type SimProvider = 'FREE' | 'ORANGE' | 'BOUYGUES' | 'SFR' | 'CORIOLIS'
```

## Implementation

1. Read `web/src/types/index.ts` to see the current `SimCardSummary` and `PhoneSummary` definitions.

2. Add `provider` and `number` to `SimCardSummary`:
   ```typescript
   provider: 'FREE' | 'ORANGE' | 'BOUYGUES' | 'SFR' | 'CORIOLIS' | null
   number: string | null
   ```

3. Add `provider` and `number` to `PhoneSummary.sim_card` inline type:
   ```typescript
   sim_card: {
     id: string
     type: 'prepaid' | 'postpaid'
     provider: 'FREE' | 'ORANGE' | 'BOUYGUES' | 'SFR' | 'CORIOLIS' | null
     number: string | null
     base_monthly_fee: number
   } | null
   ```

4. Export a `SimProvider` type from the same file:
   ```typescript
   export type SimProvider = 'FREE' | 'ORANGE' | 'BOUYGUES' | 'SFR' | 'CORIOLIS'
   ```

5. Run TypeScript check to confirm no regressions:
   ```bash
   cd web && pnpm tsc --noEmit
   ```

## Acceptance criteria

- [ ] `SimCardSummary.provider` typed as `SimProvider | null`
- [ ] `SimCardSummary.number` typed as `string | null`
- [ ] `PhoneSummary.sim_card.provider` typed as `SimProvider | null`
- [ ] `PhoneSummary.sim_card.number` typed as `string | null`
- [ ] `SimProvider` type exported from `web/src/types/index.ts`
- [ ] `pnpm tsc --noEmit` passes with no new errors
- [ ] All automated checks pass

## Automated checks

```bash
cd web && pnpm tsc --noEmit && pnpm build
```
