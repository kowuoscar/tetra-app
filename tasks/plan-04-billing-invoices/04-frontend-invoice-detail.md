# Frontend — Invoice Detail Page

## Domain

frontend

## Plan

`plans/plan-04-billing-invoices.md`

## Depends on

- `tasks/plan-04-billing-invoices/02-backend-invoice-service.md` — GET /invoices/{id}, PATCH, POST /send, POST /mark-paid, GET /pdf
- `tasks/plan-04-billing-invoices/03-frontend-invoice-list.md` — types and data functions defined [parallel, types must exist]

## References

- `specs/frontend.md#invoice-detail`
- `docs/contracts.md#get-invoicesid`

## Context

`/invoices/[id]` — admin and company only. Shows all company-wide invoice fields (no line items). Company can edit `rolling_advance_current` on draft; admin can also edit `support_fees`. Send and mark-paid are separate action buttons (not a dropdown). PDF streams binary from backend — link opens in new tab with credentials.

---

## Implementation

### 1. Page

`src/app/(main)/invoices/[id]/page.tsx` — Server Component:
```tsx
import { getMe } from '@/lib/data/auth'
import { requireRole } from '@/lib/utils/guards'
import { InvoiceDetailView } from '@/components/features/invoices/InvoiceDetailView'

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const user = await getMe()
  requireRole(user!, ['admin', 'company'])
  return <InvoiceDetailView invoiceId={params.id} userRole={user!.role} />
}
```

### 2. InvoiceDetailView — `"use client"`

`src/components/features/invoices/InvoiceDetailView.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoice, patchInvoice, sendInvoice, markInvoicePaid, getInvoicePdfUrl }
  from '@/lib/data/invoices'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { InvoiceStatus } from '@/types'

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-bg-tertiary text-text-secondary',
  sent:  'bg-blue-50 text-blue-700',
  paid:  'bg-status-success-bg text-status-success',
}

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function InvoiceDetailView({
  invoiceId, userRole,
}: { invoiceId: string; userRole: string }) {
  const qc = useQueryClient()
  const isAdmin = userRole === 'admin'
  const isAdminOrCompany = userRole === 'admin' || userRole === 'company'

  const [supportFees, setSupportFees] = useState('')
  const [rollingCurrent, setRollingCurrent] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoice(invoiceId),
    onSuccess: (data) => {
      setSupportFees(data.support_fees.toFixed(2))
      setRollingCurrent(data.rolling_advance_current.toFixed(2))
    },
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    qc.invalidateQueries({ queryKey: ['invoices'] })
  }

  const patchMutation = useMutation({
    mutationFn: (data: { support_fees?: number; rolling_advance_current?: number }) =>
      patchInvoice(invoiceId, data),
    onSuccess: invalidate,
    onError: (e: unknown) => setActionError((e as { message?: string }).message ?? 'Save failed'),
  })

  const sendMutation = useMutation({
    mutationFn: () => sendInvoice(invoiceId),
    onSuccess: invalidate,
    onError: (e: unknown) => setActionError((e as { message?: string }).message ?? 'Send failed'),
  })

  const paidMutation = useMutation({
    mutationFn: () => markInvoicePaid(invoiceId),
    onSuccess: invalidate,
    onError: (e: unknown) => setActionError((e as { message?: string }).message ?? 'Update failed'),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-bg-tertiary rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (error || !inv) {
    return <p className="text-status-error text-sm">Invoice not found or access denied.</p>
  }

  const isDraft = inv.status === 'draft'
  const isSent  = inv.status === 'sent'

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary font-mono">
            Invoice #{inv.invoice_number}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {MONTHS[inv.period_month]} {inv.period_year}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${STATUS_COLORS[inv.status]}`}>
            {inv.status}
          </span>
          {inv.pdf_available && (
            <a
              href={getInvoicePdfUrl(invoiceId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-brand-primary border border-brand-primary rounded-md px-3 py-1.5 hover:bg-brand-secondary transition-colors"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="flex gap-6 text-xs text-text-secondary">
        <span>Created: {new Date(inv.created_at).toLocaleDateString()}</span>
        {inv.sent_at && <span>Sent: {new Date(inv.sent_at).toLocaleDateString()}</span>}
        {inv.paid_at && <span>Paid: {new Date(inv.paid_at).toLocaleDateString()}</span>}
      </div>

      {/* Amounts */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Description</th>
              <th className="px-4 py-3 text-right text-text-secondary font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-4 py-3 text-text-primary">Support Fees</td>
              <td className="px-4 py-3 text-right text-text-secondary">{inv.support_fees.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-text-primary">Support Expenses</td>
              <td className="px-4 py-3 text-right text-text-secondary">{inv.support_expenses.toFixed(2)}</td>
            </tr>
            {inv.rolling_advance_current !== 0 && (
              <tr>
                <td className="px-4 py-3 text-text-primary">Rolling Advance (Current)</td>
                <td className="px-4 py-3 text-right text-text-secondary">
                  {inv.rolling_advance_current.toFixed(2)}
                </td>
              </tr>
            )}
            {inv.rolling_advance_previous !== 0 && (
              <tr>
                <td className="px-4 py-3 text-text-primary">Rolling Advance (Previous) — deduction</td>
                <td className="px-4 py-3 text-right text-status-error">
                  ({inv.rolling_advance_previous.toFixed(2)})
                </td>
              </tr>
            )}
            {inv.previous_balance !== 0 && (
              <tr>
                <td className="px-4 py-3 text-text-primary">Previous Balance (Unpaid)</td>
                <td className="px-4 py-3 text-right text-text-secondary">
                  {inv.previous_balance.toFixed(2)}
                </td>
              </tr>
            )}
            <tr>
              <td className="px-4 py-3 text-text-primary">Taxes</td>
              <td className="px-4 py-3 text-right text-text-secondary">{inv.taxes.toFixed(2)}</td>
            </tr>
            <tr className="bg-bg-secondary">
              <td className="px-4 py-3 font-semibold text-text-primary">Total</td>
              <td className="px-4 py-3 text-right font-semibold text-text-primary">
                {inv.total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Edit controls (draft only) */}
      {isDraft && isAdminOrCompany && (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Edit Draft</p>
          {actionError && <p className="text-xs text-status-error">{actionError}</p>}

          {isAdmin && (
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="supportFees">Support Fees</Label>
                <Input
                  id="supportFees"
                  type="number"
                  min="0"
                  step="0.01"
                  value={supportFees}
                  onChange={e => setSupportFees(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={patchMutation.isPending}
                onClick={() => {
                  setActionError(null)
                  patchMutation.mutate({ support_fees: parseFloat(supportFees) || 0 })
                }}
              >
                Save
              </Button>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="rollingCurrent">Rolling Advance (Current)</Label>
              <Input
                id="rollingCurrent"
                type="number"
                min="0"
                step="0.01"
                value={rollingCurrent}
                onChange={e => setRollingCurrent(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={patchMutation.isPending}
              onClick={() => {
                setActionError(null)
                patchMutation.mutate({ rolling_advance_current: parseFloat(rollingCurrent) || 0 })
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex gap-3">
          {isDraft && (
            <Button
              disabled={sendMutation.isPending}
              onClick={() => { setActionError(null); sendMutation.mutate() }}
            >
              {sendMutation.isPending ? 'Sending…' : 'Send Invoice'}
            </Button>
          )}
          {isSent && (
            <Button
              disabled={paidMutation.isPending}
              onClick={() => { setActionError(null); paidMutation.mutate() }}
            >
              {paidMutation.isPending ? 'Updating…' : 'Mark as Paid'}
            </Button>
          )}
          {actionError && !isDraft && (
            <p className="text-sm text-status-error self-center">{actionError}</p>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## Acceptance criteria

- [ ] `/invoices/[id]` shows invoice number, period, status badge, all amount rows
- [ ] Draft invoice: admin sees support_fees edit; admin+company see rolling_advance_current edit
- [ ] Saving a field calls `PATCH /invoices/{id}` and refreshes amounts
- [ ] Admin sees "Send Invoice" button on draft; clicking sends → status becomes sent
- [ ] Admin sees "Mark as Paid" button on sent; clicking marks paid
- [ ] `paid` invoice: no action buttons (terminal)
- [ ] "Download PDF" appears when `pdf_available=true`; opens backend stream in new tab
- [ ] Sent/paid timestamps shown when set
- [ ] `pnpm build` exits 0, no type errors

## Automated checks

```bash
cd web
pnpm tsc --noEmit
pnpm build
```
