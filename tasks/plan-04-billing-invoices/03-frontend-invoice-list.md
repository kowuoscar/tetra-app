# Frontend — Invoice List Page

## Domain

frontend

## Plan

`plans/plan-04-billing-invoices.md`

## Depends on

- `tasks/plan-04-billing-invoices/02-backend-invoice-service.md` — GET /invoices, GET /invoices/current deployed

## References

- `specs/frontend.md#invoice-list` — route, filters, columns, role behavior

## Context

`/invoices` page — admin and company only (customer gets 403). Company-wide invoice: no per-customer generate modal. Admin has a "Current Month" button to fetch/create the current draft and navigate to it. Status filter. Table rows link to `/invoices/{id}`.

**No customer_id field** — invoice is company-wide, not per-customer.

---

### Inlined spec excerpts

**Route:** `/invoices` — admin, company only

**Filters:** status (all|draft|sent|paid)

**Columns:** Invoice # | Period | Status | Total | Created | Actions

**Admin button:** "Current Month" → `GET /invoices/current` → navigate to `/invoices/{id}`

---

## Implementation

### 1. Types

Add to `src/types/index.ts`:
```typescript
export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export type InvoiceSummary = {
  id: string
  invoice_number: number
  period_month: number
  period_year: number
  status: InvoiceStatus
  total: number
  created_at: string
  sent_at: string | null
  paid_at: string | null
}

export type InvoiceDetail = InvoiceSummary & {
  support_fees: number
  support_expenses: number
  rolling_advance_current: number
  rolling_advance_previous: number
  previous_balance: number
  taxes: number
  pdf_available: boolean
}
```

### 2. Data functions

Create `src/lib/data/invoices.ts`:
```typescript
import { apiClient } from '@/lib/api/client'
import type { InvoiceSummary, InvoiceDetail, PagedResponse, InvoiceStatus } from '@/types'

export async function getInvoices(params: {
  status?: InvoiceStatus
  page?: number
  size?: number
}): Promise<PagedResponse<InvoiceSummary>> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.page !== undefined) qs.set('page', String(params.page))
  if (params.size !== undefined) qs.set('size', String(params.size))
  return apiClient(`/invoices?${qs}`)
}

export async function getCurrentInvoice(): Promise<InvoiceDetail> {
  return apiClient('/invoices/current')
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  return apiClient(`/invoices/${id}`)
}

export async function patchInvoice(id: string, data: {
  support_fees?: number
  rolling_advance_current?: number
}): Promise<InvoiceDetail> {
  return apiClient(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function sendInvoice(id: string): Promise<InvoiceDetail> {
  return apiClient(`/invoices/${id}/send`, { method: 'POST' })
}

export async function markInvoicePaid(id: string): Promise<InvoiceDetail> {
  return apiClient(`/invoices/${id}/mark-paid`, { method: 'POST' })
}

export function getInvoicePdfUrl(id: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/v1/invoices/${id}/pdf`
}
```

### 3. Page

`src/app/(main)/invoices/page.tsx` — Server Component:
```tsx
import { getMe } from '@/lib/data/auth'
import { requireRole } from '@/lib/utils/guards'
import { InvoiceListView } from '@/components/features/invoices/InvoiceListView'

export default async function InvoicesPage() {
  const user = await getMe()
  requireRole(user!, ['admin', 'company'])
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Invoices</h1>
      <InvoiceListView userRole={user!.role} />
    </div>
  )
}
```

### 4. InvoiceListView — `"use client"`

`src/components/features/invoices/InvoiceListView.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getInvoices, getCurrentInvoice } from '@/lib/data/invoices'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { InvoiceStatus } from '@/types'

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-bg-tertiary text-text-secondary',
  sent:  'bg-blue-50 text-blue-700',
  paid:  'bg-status-success-bg text-status-success',
}

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function InvoiceListView({ userRole }: { userRole: string }) {
  const router = useRouter()
  const isAdmin = userRole === 'admin'
  const [status, setStatus] = useState<InvoiceStatus | ''>('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', status, page],
    queryFn: () => getInvoices({ status: status || undefined, page, size: 20 }),
  })

  const currentMutation = useMutation({
    mutationFn: getCurrentInvoice,
    onSuccess: (inv) => router.push(`/invoices/${inv.id}`),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={v => { setStatus(v as InvoiceStatus | ''); setPage(0) }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && (
          <Button
            onClick={() => currentMutation.mutate()}
            disabled={currentMutation.isPending}
            className="ml-auto"
          >
            {currentMutation.isPending ? 'Loading…' : 'Current Month'}
          </Button>
        )}
      </div>

      {currentMutation.isError && (
        <p className="text-sm text-status-error">Failed to load current invoice.</p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-bg-tertiary rounded-lg animate-pulse" />)}
        </div>
      ) : data?.content.length === 0 ? (
        <p className="text-text-secondary text-sm py-8 text-center">No invoices found.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary border-b border-border">
              <tr>
                {['Invoice #', 'Period', 'Status', 'Total', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-text-secondary font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.content.map(inv => (
                <tr key={inv.id} className="hover:bg-bg-secondary transition-colors">
                  <td className="px-4 py-3 text-text-primary font-mono">#{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {MONTHS[inv.period_month]} {inv.period_year}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{inv.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${inv.id}`}
                      className="text-brand-primary hover:underline text-xs font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total_pages > 1 && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-text-secondary self-center">
            Page {page + 1} of {data.total_pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= data.total_pages - 1}
            onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
```

### 5. Add /invoices to nav

`src/components/layout/AppShell.tsx` — add to `NAV_ITEMS`:
```tsx
{ href: '/invoices', label: 'Invoices', roles: ['admin', 'company'] }
```

---

## Acceptance criteria

- [ ] `/invoices` accessible to admin and company; customer redirected by `requireRole`
- [ ] Admin sees "Current Month" button; clicking creates/finds current draft and navigates to it
- [ ] Status filter updates results
- [ ] No per-customer columns or generate modal (company-wide)
- [ ] Nav shows "Invoices" for admin and company roles only
- [ ] `pnpm build` exits 0, no type errors

## Automated checks

```bash
cd web
pnpm tsc --noEmit
pnpm build
```
