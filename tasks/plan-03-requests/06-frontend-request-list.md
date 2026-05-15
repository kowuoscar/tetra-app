# Frontend — Request List Page

## Domain

frontend

## Plan

`plans/plan-03-requests.md`

## Depends on

- `tasks/plan-03-requests/02-backend-request-service.md` — GET /requests deployed
- `tasks/plan-03-requests/05-frontend-new-request-form.md` — RequestType, RequestStatus, RequestSummary types defined [parallel, but types must exist]

## References

- `specs/frontend.md#request-list` — route, filters, columns, role behavior

## Context

`/requests` page with status + type filters. Customer sees only own requests (API enforces this). Admin/company see all with optional customer filter. "New Request" button for all roles. Table rows link to `/requests/{id}`.

---

### Inlined spec excerpts

**Route:** `/requests` — all roles

**Filters:**
- status: all | submitted | in_progress | done
- type: all | six request types
- customer_id: admin/company only (optional, free-text search delegated to GET /requests)

**Columns:** Type | Customer | Status | Total Fee | Created At | Actions

**States:** loading | empty | populated | error

**Role behavior:**
- Customer: no customer filter; "New Request" button links to `/requests/new`
- Admin/company: customer filter visible; all requests visible

---

## Implementation

### 1. Page

`src/app/(main)/requests/page.tsx` — Server Component:
```tsx
import { RequestListView } from '@/components/features/requests/RequestListView'
import Link from 'next/link'

export default function RequestsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Requests</h1>
        <Link
          href="/requests/new"
          className="inline-flex items-center px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          New Request
        </Link>
      </div>
      <RequestListView />
    </div>
  )
}
```

### 2. RequestListView — `"use client"`

`src/components/features/requests/RequestListView.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getRequests } from '@/lib/data/requests'
import { useAuthStore } from '@/lib/stores/authStore'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { RequestStatus, RequestType } from '@/types'

const STATUS_OPTIONS: { value: RequestStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const TYPE_OPTIONS: { value: RequestType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'phone_repair', label: 'Phone Repair' },
  { value: 'phone_replacement', label: 'Phone Replacement' },
  { value: 'sim_topup', label: 'SIM Top-Up' },
  { value: 'new_sim', label: 'New SIM' },
  { value: 'manual_support', label: 'Manual Support' },
  { value: 'onboarding', label: 'Onboarding' },
]

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted:   'bg-status-warning-bg text-status-warning',
  in_progress: 'bg-blue-50 text-blue-700',
  done:        'bg-status-success-bg text-status-success',
}

export function RequestListView() {
  const [status, setStatus] = useState<RequestStatus | ''>('')
  const [type, setType] = useState<RequestType | ''>('')
  const [page, setPage] = useState(0)
  const isAdminOrCompany = useAuthStore(s => s.isAdmin() || s.isCompany())

  const { data, isLoading } = useQuery({
    queryKey: ['requests', status, type, page],
    queryFn: () => getRequests({
      status: status || undefined,
      type: type || undefined,
      page,
      size: 20,
    }),
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={v => { setStatus(v as RequestStatus | ''); setPage(0) }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={v => { setType(v as RequestType | ''); setPage(0) }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-12 bg-bg-tertiary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : data?.content.length === 0 ? (
        <p className="text-text-secondary text-sm py-8 text-center">No requests found.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary border-b border-border">
              <tr>
                {['Type', ...(isAdminOrCompany ? ['Customer'] : []), 'Status', 'Fee', 'Created', ''].map(h => (
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
                  {isAdminOrCompany && (
                    <td className="px-4 py-3 text-text-secondary">{req.customer_name}</td>
                  )}
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

      {/* Pagination */}
      {data && data.total_pages > 1 && (
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

---

## Acceptance criteria

- [ ] `/requests` loads and displays paginated request list
- [ ] Status and type filters update results without page reload
- [ ] Customer sees only own requests; "Customer" column hidden for customer role
- [ ] Admin/company see all requests with Customer column
- [ ] "New Request" button links to `/requests/new`
- [ ] Clicking "View" navigates to `/requests/{id}`
- [ ] `pnpm build` exits 0, no type errors

## Automated checks

```bash
cd web
pnpm tsc --noEmit
pnpm build
```
