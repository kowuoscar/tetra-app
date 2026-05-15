# Frontend — Requests Tab in Customer Detail + History Page

## Domain

frontend

## Plan

`plans/plan-03-requests.md`

## Depends on

- `tasks/plan-03-requests/02-backend-request-service.md` — GET /requests?customer_id deployed
- `tasks/plan-03-requests/05-frontend-new-request-form.md` — types (RequestSummary, RequestType, RequestStatus) defined [parallel, types must exist]

## References

- `specs/frontend.md#customer-detail` — Requests tab replacing placeholder
- `specs/frontend.md#history` — /history page (admin only)

## Context

Two changes: (1) Replace "Requests coming in plan-03" placeholder in `CustomerDetailView` Requests tab with a live `CustomerRequestsTab` component. (2) Create `/history` page showing all done requests across all customers (admin only).

---

### Inlined spec excerpts

**Customer detail Requests tab:**
```
Component: CustomerRequestsTab
Data: GET /requests?customer_id={customerId} (no status filter)
Columns: Type | Status | Fee | Date | Link
Admin only: status badge is clickable → opens inline status update (PATCH /requests/{id})
All roles: "New Request" link → /requests/new?customer_id={customerId}
```

**History page — `/history`:**
```
Route: /history — admin only
Purpose: All done requests across all customers, with time_spent_minutes
Data: GET /requests?status=done&page&size
Columns: Type | Customer | Done Date | Time Spent | Fee
```

---

## Implementation

### 1. CustomerRequestsTab

`src/components/features/customers/CustomerRequestsTab.tsx` — `"use client"`:

```tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getRequests } from '@/lib/data/requests'
import type { RequestStatus } from '@/types'

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted:   'bg-status-warning-bg text-status-warning',
  in_progress: 'bg-blue-50 text-blue-700',
  done:        'bg-status-success-bg text-status-success',
}

export function CustomerRequestsTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'customer', customerId],
    queryFn: () => getRequests({ customer_id: customerId, size: 50 }),
  })

  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end">
        <Link
          href={`/requests/new?customer_id=${customerId}`}
          className="text-sm font-medium text-brand-primary border border-brand-primary rounded-md px-3 py-1.5 hover:bg-brand-secondary transition-colors"
        >
          New Request
        </Link>
      </div>

      {isLoading && <p className="text-text-secondary text-sm">Loading…</p>}

      {!isLoading && data?.content.length === 0 && (
        <p className="text-text-secondary text-sm">No requests for this customer.</p>
      )}

      {!isLoading && (data?.content.length ?? 0) > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary border-b border-border">
              <tr>
                {['Type', 'Status', 'Fee', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-text-secondary font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.content.map(req => (
                <tr key={req.id} className="hover:bg-bg-secondary transition-colors">
                  <td className="px-4 py-3 text-text-primary capitalize">
                    {req.type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[req.status]}`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">€{req.fee != null ? req.fee.toFixed(2) : '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/requests/${req.id}`}
                      className="text-brand-primary hover:underline text-xs font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

### 2. Wire into CustomerDetailView

`src/components/features/customers/CustomerDetailView.tsx` — replace placeholder:

```tsx
// Add import:
import { CustomerRequestsTab } from './CustomerRequestsTab'

// Replace:
<TabsContent value="requests">
  <p className="text-text-secondary text-sm mt-4">Requests coming in plan-03.</p>
</TabsContent>

// With:
<TabsContent value="requests">
  <CustomerRequestsTab customerId={customer.id} />
</TabsContent>
```

### 3. History page

`src/app/(main)/history/page.tsx` — Server Component:
```tsx
import { getMe } from '@/lib/data/auth'
import { requireRole } from '@/lib/utils/guards'
import { HistoryView } from '@/components/features/requests/HistoryView'

export default async function HistoryPage() {
  const user = await getMe()
  requireRole(user!, 'admin')
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Request History</h1>
      <HistoryView />
    </div>
  )
}
```

`src/components/features/requests/HistoryView.tsx` — `"use client"`:
```tsx
'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRequests } from '@/lib/data/requests'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function HistoryView() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'done', page],
    queryFn: () => getRequests({ status: 'done', page, size: 20 }),
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-12 bg-bg-tertiary rounded-lg animate-pulse" />)}
      </div>
    )
  }

  if (!data?.content.length) {
    return <p className="text-text-secondary text-sm py-8 text-center">No completed requests yet.</p>
  }

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary border-b border-border">
            <tr>
              {['Type', 'Customer', 'Done Date', 'Time Spent', 'Fee', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-text-secondary font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.content.map(req => (
              <tr key={req.id} className="hover:bg-bg-secondary transition-colors">
                <td className="px-4 py-3 text-text-primary capitalize">
                  {req.type.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 text-text-secondary">{req.customer_name}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {req.done_at ? new Date(req.done_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {'time_spent_minutes' in req && req.time_spent_minutes != null
                    ? `${req.time_spent_minutes} min`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-text-secondary">€{req.fee != null ? req.fee.toFixed(2) : '—'}</td>
                <td className="px-4 py-3">
                  <Link href={`/requests/${req.id}`} className="text-brand-primary hover:underline text-xs font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.total_pages > 1 && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-text-secondary self-center">
            Page {page + 1} of {data.total_pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= data.total_pages - 1} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
```

### 4. Add /history to nav

`src/components/layout/AppShell.tsx` — add to `NAV_ITEMS`:
```tsx
{ href: '/history', label: 'History', roles: ['admin'] }
```

---

## Acceptance criteria

- [ ] Customer detail Requests tab renders live request list (replaces placeholder)
- [ ] "New Request" link in Requests tab pre-fills `customer_id` query param
- [ ] `/history` route accessible to admin only; non-admin redirect to `/overview`
- [ ] History table shows done requests with customer name and done date
- [ ] `time_spent_minutes` column renders when admin role
- [ ] `pnpm build` exits 0, no type errors

## Automated checks

```bash
cd web
pnpm tsc --noEmit
pnpm build
```
