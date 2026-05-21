# Task 04 — Frontend: Rebuild StatusBadge component

## Domain
frontend

## Plan
`plans/plan-02p-customer-asset-improvements.md`

## Depends on
None — standalone component; no backend dependency.

## References
- `specs/frontend.md#StatusBadge (rebuilt)` — component spec, variant mapping, statusVariant() helper
- `design/tokens.md` — status color tokens
- `design/preview.html#badges` — visual reference: dot indicator + 6 semantic variants

## Drift context

From `docs/drift-report.md` (Type B — Modification drift):
- `web/src/components/ui/badge.tsx` currently uses Base UI `useRender`/`mergeProps` with `default/secondary/destructive/outline/ghost/link` variants — no dot indicator, no semantic status variants
- All pages currently use an inline `StatusPill` workaround defined in tab components
- Both must be replaced: `badge.tsx` becomes the canonical `StatusBadge`; all `StatusPill` usages updated to `StatusBadge`

Also from drift report (Type B — Modification drift):
- `EditPhoneModal` in `CustomerPhonesTab.tsx` renders `<option value="replaced">Replaced</option>` as a selectable status — backend returns 422. Remove this option while in this file.

## Context

`badge.tsx` is broken — it uses Base UI primitives with wrong variants, produces no dot indicator, and cannot represent request/phone/SIM/invoice statuses. Every tab currently uses a hand-rolled `StatusPill` instead. This task replaces `badge.tsx` entirely with a self-contained `<span>`-based component that matches the preview, then updates all call sites from `StatusPill` → `StatusBadge`. The `EditPhoneModal` `replaced` option bug is also fixed in this task since it touches the same file.

### Inlined spec excerpts

**BadgeVariant type:**
```typescript
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand'
```

**Variant → token mapping:**
```
success → bg: status.successBg  text: status.success  dot: status.success
warning → bg: status.warningBg  text: status.warning  dot: status.warning
error   → bg: status.errorBg    text: status.error    dot: status.error
info    → bg: status.infoBg     text: status.info     dot: status.info
neutral → bg: background.tertiary  text: text.secondary  dot: text.disabled
brand   → bg: brand.secondary   text: brand.primary   dot: none (no dot for brand)
```

**statusVariant() helper — canonical domain → variant mapping:**
```typescript
// Request status
'submitted'   → 'info'
'in_progress' → 'warning'
'done'        → 'success'

// Phone status
'active'      → 'success'
'in_repair'   → 'warning'
'replaced'    → 'neutral'

// SIM card status
'active'      → 'success'
'unassigned'  → 'warning'
'cancelled'   → 'neutral'

// Invoice status
'draft'       → 'neutral'
'sent'        → 'info'
'paid'        → 'success'
```

**Component interface:**
```typescript
interface StatusBadgeProps {
  variant?: BadgeVariant  // default: 'neutral'
  dot?: boolean           // default: true
  children: React.ReactNode
  className?: string
}
```

**Dot dimensions:** 6px × 6px, `border-radius: 9999px`, same color as text.

**Files to update after rebuild:**
- `web/src/components/features/customers/CustomerPhonesTab.tsx` — replace `StatusPill` + fix `EditPhoneModal` `replaced` option
- `web/src/components/features/customers/CustomerSimCardsTab.tsx` — replace `StatusPill`
- Any other file that imports from `badge.tsx` or defines an inline `StatusPill`

## Implementation

1. Read `web/src/components/ui/badge.tsx` to confirm current content before replacing.

2. Replace `badge.tsx` entirely with:
   ```tsx
   import { cn } from '@/lib/utils'

   type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand'

   const variantClasses: Record<BadgeVariant, string> = {
     success: 'bg-status-successBg text-status-success',
     warning: 'bg-status-warningBg text-status-warning',
     error:   'bg-status-errorBg   text-status-error',
     info:    'bg-status-infoBg    text-status-info',
     neutral: 'bg-background-tertiary text-text-secondary',
     brand:   'bg-brand-secondary  text-brand-primary',
   }

   const dotClasses: Record<BadgeVariant, string> = {
     success: 'bg-status-success',
     warning: 'bg-status-warning',
     error:   'bg-status-error',
     info:    'bg-status-info',
     neutral: 'bg-text-disabled',
     brand:   'bg-brand-primary',
   }

   export function statusVariant(
     status: string
   ): BadgeVariant {
     const map: Record<string, BadgeVariant> = {
       submitted: 'info',    in_progress: 'warning', done: 'success',
       active: 'success',    in_repair: 'warning',   replaced: 'neutral',
       unassigned: 'warning', cancelled: 'neutral',
       draft: 'neutral',     sent: 'info',           paid: 'success',
     }
     return map[status] ?? 'neutral'
   }

   interface StatusBadgeProps {
     variant?: BadgeVariant
     dot?: boolean
     children: React.ReactNode
     className?: string
   }

   export function StatusBadge({
     variant = 'neutral',
     dot = true,
     children,
     className,
   }: StatusBadgeProps) {
     return (
       <span
         className={cn(
           'inline-flex items-center gap-[5px] rounded-full px-2 py-[2px]',
           'text-xs font-medium leading-[1.5] whitespace-nowrap',
           variantClasses[variant],
           className
         )}
       >
         {dot && variant !== 'brand' && (
           <span className={cn('w-[6px] h-[6px] rounded-full flex-shrink-0', dotClasses[variant])} />
         )}
         {children}
       </span>
     )
   }
   ```
   Verify the Tailwind token class names match `design/tokens.md` exactly (e.g. `bg-status-successBg` → confirm the exact Tailwind class name defined in the project config).

3. Search for all `StatusPill` definitions and usages:
   ```bash
   grep -rn "StatusPill" web/src/
   ```
   For each occurrence, replace the inline component and its usages with `<StatusBadge variant={statusVariant(status)}>{label}</StatusBadge>` using the canonical `statusVariant()` helper.

4. In `CustomerPhonesTab.tsx`, find `EditPhoneModal` and remove the `<option value="replaced">Replaced</option>` option. Valid options are `active` and `in_repair` only.

5. Search for any remaining imports of the old `Badge` from `badge.tsx`:
   ```bash
   grep -rn "from.*badge\|from.*Badge" web/src/
   ```
   Update any remaining imports to use `StatusBadge` from the new file.

6. Run TypeScript check:
   ```bash
   cd web && pnpm tsc --noEmit
   ```

## Acceptance criteria

- [ ] `badge.tsx` exports `StatusBadge` and `statusVariant` — no Base UI imports remain
- [ ] All 6 variants render a coloured background, matching text colour, and a 6px dot (brand variant has no dot)
- [ ] `statusVariant('submitted')` → `'info'`, `statusVariant('in_repair')` → `'warning'`, etc.
- [ ] All `StatusPill` workarounds removed from `CustomerPhonesTab.tsx` and `CustomerSimCardsTab.tsx`
- [ ] `EditPhoneModal` no longer renders `<option value="replaced">Replaced</option>`
- [ ] `pnpm tsc --noEmit` passes with no errors
- [ ] All automated checks pass

## Automated checks

```bash
cd web && pnpm tsc --noEmit && pnpm build
```
