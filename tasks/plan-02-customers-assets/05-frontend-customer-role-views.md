# Frontend — My Phones and My SIM Cards (Customer Role)

## Domain

frontend

## Plan

`plans/plan-02-customers-assets.md`

## Depends on

- `tasks/plan-02-customers-assets/01-backend-phone-simcard-entities.md` — GET /customers/{id}/phones and GET /customers/{id}/sim-cards deployed

## References

- `specs/frontend.md` — My Phones and My SIM Cards pages (customer role)
- `vision.md#customer-dashboard` — customer sees only active/in_repair phones and active/unassigned SIMs

## Context

Build `/phones` and `/sim-cards` pages for the customer role. These pages read `customer_id` from the Zustand auth store and call the same phone/SIM endpoints as admin/company — the API scopes data automatically to the authenticated user's customer. Active phones have a link to `/requests/new?phone_id=X` for quick request submission.

---

### Inlined spec excerpts

**My Phones page — `/phones`**
```
Route: /phones — customer only
Purpose: View active + in_repair phones. Click phone → detail view with
         option to submit request pre-linked to that phone.
States: loading | empty | populated
Contracts:
  GET /customers/{customer_id}/phones → { phones: PhoneSummary[] }
  (customer_id from JWT via auth store)
```

**My SIM Cards page — `/sim-cards`**
```
Route: /sim-cards — customer only
Purpose: View active + unassigned SIM cards. Click SIM → option to submit request.
States: loading | empty | populated
Contracts:
  GET /customers/{customer_id}/sim-cards → { sim_cards: SimCardSummary[] }
```

**is_unused visual:** amber banner "This phone has no SIM card assigned" / "This SIM has no phone assigned".

**Customer role redirect guard:** these pages must call `requireRole(user, 'customer')` — admin/company landing here get redirected to `/overview`.

---

## Implementation

### 1. My Phones page

`src/app/(main)/phones/page.tsx` — Server Component:
```tsx
import { cookies } from 'next/headers'
import { getMe } from '@/lib/data/auth'
import { requireRole } from '@/lib/utils/guards'
import { PhonesView } from '@/components/features/phones/PhonesView'

export default async function PhonesPage() {
  const user = await getMe()
  requireRole(user!, 'customer')
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">My Phones</h1>
      <PhonesView customerId={user!.customer_id!} />
    </div>
  )
}
```

`src/components/features/phones/PhonesView.tsx` — `"use client"`:
```tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { getCustomerPhones } from '@/lib/data/customers'
import Link from 'next/link'

const STATUS_COLORS = {
  active:    'bg-status-success-bg text-status-success',
  in_repair: 'bg-status-warning-bg text-status-warning',
  replaced:  'bg-bg-tertiary text-text-secondary',
}
const STATUS_LABELS = { active: 'Active', in_repair: 'In Repair', replaced: 'Replaced' }

export function PhonesView({ customerId }: { customerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-phones', customerId],
    queryFn: () => getCustomerPhones(customerId, false),
  })

  if (isLoading) return <LoadingSkeleton />

  if (!data?.phones.length) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">No phones assigned to your account.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.phones.map(phone => (
        <div key={phone.id} className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-text-primary">{phone.model}</p>
              <p className="text-xs text-text-secondary capitalize mt-0.5">{phone.ownership}-owned</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[phone.status]}`}>
              {STATUS_LABELS[phone.status]}
            </span>
          </div>

          {phone.is_unused && (
            <div className="bg-status-warning-bg border border-amber-200 rounded-md px-3 py-2 text-xs text-status-warning">
              No SIM card assigned
            </div>
          )}

          {phone.sim_card && (
            <p className="text-xs text-text-secondary">
              SIM: {phone.sim_card.type} · €{phone.sim_card.base_monthly_fee.toFixed(2)}/mo
            </p>
          )}

          <Link
            href={`/requests/new?phone_id=${phone.id}&customer_id=${customerId}`}
            className="block text-center text-sm font-medium text-brand-primary border border-brand-primary rounded-md py-2 hover:bg-brand-secondary transition-colors"
          >
            Submit Request
          </Link>
        </div>
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-44 bg-bg-tertiary rounded-xl animate-pulse" />
      ))}
    </div>
  )
}
```

### 2. My SIM Cards page

`src/app/(main)/sim-cards/page.tsx` — Server Component (same pattern as phones page):
```tsx
import { getMe } from '@/lib/data/auth'
import { requireRole } from '@/lib/utils/guards'
import { SimCardsView } from '@/components/features/simcards/SimCardsView'

export default async function SimCardsPage() {
  const user = await getMe()
  requireRole(user!, 'customer')
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">My SIM Cards</h1>
      <SimCardsView customerId={user!.customer_id!} />
    </div>
  )
}
```

`src/components/features/simcards/SimCardsView.tsx` — `"use client"`:

Same pattern as `PhonesView`. For each SIM card:
- Status badge: active → green, unassigned → amber, cancelled → slate
- `is_unused` banner: "No phone assigned" when `is_unused=true`
- SIM type badge (prepaid/postpaid)
- Base monthly fee display
- "Submit Request" link → `/requests/new?sim_card_id={id}&customer_id={customerId}`

Status colors:
```typescript
const STATUS_COLORS = {
  active:     'bg-status-success-bg text-status-success',
  unassigned: 'bg-status-warning-bg text-status-warning',
  cancelled:  'bg-bg-tertiary text-text-secondary',
}
```

### 3. Ensure getMe is exported from lib/data/auth.ts

Extract `getMe` from `(main)/layout.tsx` into `src/lib/data/auth.ts`:
```typescript
import { cookies } from 'next/headers'
import type { UserSummary } from '@/types'

export async function getMe(): Promise<UserSummary | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')
  if (!token) return null
  try {
    const res = await fetch(
      `${process.env.API_URL ?? 'http://localhost:8080'}/api/v1/auth/me`,
      { headers: { Cookie: `access_token=${token.value}` }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.user as UserSummary
  } catch { return null }
}
```

Update `(main)/layout.tsx` to import from `@/lib/data/auth` instead of defining inline.

---

## Acceptance criteria

- [ ] `/phones` loads and displays the customer's phones with status badges
- [ ] Phones with `is_unused=true` show "No SIM card assigned" warning
- [ ] "Submit Request" link on each phone pre-fills `phone_id` in the query string
- [ ] `/sim-cards` loads and displays the customer's SIM cards
- [ ] SIMs with `is_unused=true` show "No phone assigned" warning
- [ ] Admin or company user accessing `/phones` is redirected to `/overview`
- [ ] `pnpm build` exits 0, no type errors

## Automated checks

```bash
cd web
pnpm tsc --noEmit
pnpm build
```
