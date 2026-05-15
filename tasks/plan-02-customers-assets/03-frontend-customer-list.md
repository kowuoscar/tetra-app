# Frontend — Customer List Page

## Domain

frontend

## Plan

`plans/plan-02-customers-assets.md`

## Depends on

- `tasks/plan-02-customers-assets/02-backend-aggregations.md` — `GET /customers` and `GET /dashboard/stats` must be deployed

## References

- `specs/frontend.md#customer-list` — route, states, components
- `specs/frontend.md#overview` — Overview page using DashboardStats

## Context

Build the `/customers` page (admin/company) with a searchable, paginated customer table and a create-customer modal. Also wire the `/overview` page to call `GET /dashboard/stats` and render stat cards. Both pages share the `AppShell` from plan-01.

---

### Inlined spec excerpts

**Overview page — `/overview`**
```
Route: /overview — admin, company
States: loading | populated
Contract: GET /dashboard/stats → { total_customers, total_phones, total_sim_cards, open_requests }
Components: AppShell, PageHeader, StatsGrid, StatCard
```

**Customer List page — `/customers`**
```
Route: /customers — admin, company
States: loading | empty | populated
Contracts:
  GET /customers?page&size&search → PagedResponse<CustomerSummary>
  POST /customers → CustomerDetail  (admin only — create modal)
Components: AppShell, PageHeader, SearchInput, CustomerTable, CustomerRow,
            CreateCustomerModal, Pagination
```

**CustomerSummary type:**
```typescript
type CustomerSummary = {
  id: string
  name: string
  contact_info: string
  phone_count: number
  sim_card_count: number
  open_request_count: number
  current_month_cost: number
  created_at: string
}
```

**CreateCustomerModal fields:** name (required), contact_info (required), whatsapp_group_id (required).

---

## Implementation

### 1. Shared types

Add to `src/types/index.ts`:
```typescript
export type DashboardStats = {
  total_customers: number
  total_phones: number
  total_sim_cards: number
  open_requests: number
}

export type CustomerSummary = {
  id: string
  name: string
  contact_info: string
  phone_count: number
  sim_card_count: number
  open_request_count: number
  current_month_cost: number
  created_at: string
}

export type CustomerDetail = CustomerSummary & {
  whatsapp_group_id: string
}

export type PagedResponse<T> = {
  content: T[]
  total_elements: number
  total_pages: number
  page: number
  size: number
}
```

### 2. Data fetching functions

Create `src/lib/data/customers.ts`:
```typescript
import { apiClient } from '@/lib/api/client'
import type { CustomerSummary, CustomerDetail, PagedResponse } from '@/types'

export async function getCustomers(params: {
  page?: number; size?: number; search?: string
}): Promise<PagedResponse<CustomerSummary>> {
  const qs = new URLSearchParams()
  if (params.page !== undefined) qs.set('page', String(params.page))
  if (params.size !== undefined) qs.set('size', String(params.size))
  if (params.search) qs.set('search', params.search)
  return apiClient(`/customers?${qs}`)
}

export async function createCustomer(data: {
  name: string; contact_info: string; whatsapp_group_id: string
}): Promise<CustomerDetail> {
  return apiClient('/customers', { method: 'POST', body: JSON.stringify(data) })
}
```

Create `src/lib/data/dashboard.ts`:
```typescript
import { apiClient } from '@/lib/api/client'
import type { DashboardStats } from '@/types'

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient('/dashboard/stats')
}
```

### 3. Overview page

Replace placeholder `src/app/(main)/overview/page.tsx`:

```tsx
import { getDashboardStats } from '@/lib/data/dashboard'

export default async function OverviewPage() {
  const stats = await getDashboardStats()

  const cards = [
    { label: 'Customers',     value: stats.total_customers },
    { label: 'Phones',        value: stats.total_phones },
    { label: 'SIM Cards',     value: stats.total_sim_cards },
    { label: 'Open Requests', value: stats.open_requests },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-surface rounded-xl border border-border p-5 shadow-sm">
            <p className="text-sm text-text-secondary">{card.label}</p>
            <p className="text-3xl font-semibold text-text-primary mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

This is a Server Component — data fetched server-side. No TanStack Query needed here.

### 4. Customer list page

Replace placeholder `src/app/(main)/customers/page.tsx`:

```tsx
import { Suspense } from 'react'
import { CustomerListView } from '@/components/features/customers/CustomerListView'

export default function CustomersPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Customers</h1>
      <Suspense fallback={<CustomerListSkeleton />}>
        <CustomerListView />
      </Suspense>
    </div>
  )
}

function CustomerListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 bg-bg-tertiary rounded-lg animate-pulse" />
      ))}
    </div>
  )
}
```

Create `src/components/features/customers/CustomerListView.tsx` — `"use client"`:

```tsx
'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/useDebounce'
import { getCustomers } from '@/lib/data/customers'
import { useAuthStore } from '@/lib/stores/authStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CreateCustomerModal } from './CreateCustomerModal'
import Link from 'next/link'
import type { CustomerSummary } from '@/types'

export function CustomerListView() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const debouncedSearch = useDebounce(search, 300)
  const isAdmin = useAuthStore(s => s.isAdmin())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', debouncedSearch, page],
    queryFn: () => getCustomers({ page, size: 20, search: debouncedSearch }),
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          placeholder="Search customers…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className="max-w-xs"
        />
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)}>New Customer</Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-text-secondary text-sm">Loading…</p>
      ) : data?.content.length === 0 ? (
        <p className="text-text-secondary text-sm">No customers found.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary border-b border-border">
              <tr>
                {['Name','Phones','SIM Cards','Open Requests','Month Cost'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-text-secondary font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.content.map((c: CustomerSummary) => (
                <tr key={c.id} className="hover:bg-bg-secondary transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="text-brand-primary hover:underline font-medium">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{c.phone_count}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.sim_card_count}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.open_request_count}</td>
                  <td className="px-4 py-3 text-text-secondary">€{c.current_month_cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-text-secondary self-center">Page {page + 1} of {data.total_pages}</span>
          <Button variant="outline" disabled={page >= data.total_pages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {showCreate && (
        <CreateCustomerModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refetch() }} />
      )}
    </div>
  )
}
```

Create `src/hooks/useDebounce.ts`:
```typescript
import { useState, useEffect } from 'react'
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
```

### 5. CreateCustomerModal

Create `src/components/features/customers/CreateCustomerModal.tsx` — `"use client"`:

```tsx
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCustomer } from '@/lib/data/customers'

export function CreateCustomerModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const data = new FormData(e.currentTarget)
    try {
      await createCustomer({
        name: data.get('name') as string,
        contact_info: data.get('contact_info') as string,
        whatsapp_group_id: data.get('whatsapp_group_id') as string,
      })
      onCreated()
    } catch {
      setError('Failed to create customer. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && <p className="text-sm text-status-error">{error}</p>}
          {[
            { name: 'name', label: 'Name' },
            { name: 'contact_info', label: 'Contact info' },
            { name: 'whatsapp_group_id', label: 'WhatsApp group ID' },
          ].map(f => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name}>{f.label}</Label>
              <Input id={f.name} name={f.name} required disabled={submitting} />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Acceptance criteria

- [ ] `/overview` shows four stat cards with live counts from `GET /dashboard/stats`
- [ ] `/customers` loads customer list with name, phone count, SIM count, open requests, monthly cost columns
- [ ] Search input debounces and filters customer list
- [ ] Admin sees "New Customer" button; company does not
- [ ] Create customer modal creates customer and refreshes the list
- [ ] Clicking customer name navigates to `/customers/[id]`
- [ ] `pnpm build` exits 0, no type errors

## Automated checks

```bash
cd web
pnpm tsc --noEmit
pnpm build
```
