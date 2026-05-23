'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoice, patchInvoice, sendInvoice, markInvoicePaid, getInvoicePdfUrl } from '@/lib/data/invoices'
import { useAuthStore } from '@/lib/stores/authStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { InvoiceStatus } from '@/types'

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-bg-tertiary text-text-secondary',
  sent: 'bg-status-info-bg text-status-info',
  paid: 'bg-status-success-bg text-status-success',
}

const INPUT_CLS =
  'h-8 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 disabled:opacity-50'

interface Props {
  invoiceId: string
}

export function InvoiceDetailView({ invoiceId }: Props) {
  const qc = useQueryClient()
  const isAdmin = useAuthStore(s => s.isAdmin())
  const isAdminOrCompany = useAuthStore(s => s.isAdmin() || s.isCompany())

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoice(invoiceId),
  })

  const [supportFees, setSupportFees] = useState('')
  const [rollingCurrent, setRollingCurrent] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (inv) {
      setSupportFees(inv.support_fees.toFixed(2))
      setRollingCurrent(inv.rolling_advance_current.toFixed(2))
    }
  }, [inv?.id])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })

  const patchMutation = useMutation({
    mutationFn: (data: { support_fees?: number; rolling_advance_current?: number }) =>
      patchInvoice(invoiceId, data),
    onSuccess: () => { setSaveError(null); invalidate() },
    onError: (e: unknown) => setSaveError((e as { message?: string }).message ?? 'Update failed'),
  })

  const sendMutation = useMutation({
    mutationFn: () => sendInvoice(invoiceId),
    onSuccess: () => { setSaveError(null); invalidate() },
    onError: (e: unknown) => setSaveError((e as { message?: string }).message ?? 'Failed to send invoice'),
  })

  const paidMutation = useMutation({
    mutationFn: () => markInvoicePaid(invoiceId),
    onSuccess: () => { setSaveError(null); invalidate() },
    onError: (e: unknown) => setSaveError((e as { message?: string }).message ?? 'Failed to mark as paid'),
  })

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="bg-surface border border-border rounded-xl px-6 py-5 space-y-3">
          <div className="h-6 bg-bg-secondary rounded w-40" />
          <div className="h-4 bg-bg-secondary rounded w-32" />
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 h-48" />
      </div>
    )
  }

  if (error || !inv) {
    return (
      <p className="text-sm text-status-error">Failed to load invoice. Please try again.</p>
    )
  }

  const isDraft = inv.status === 'draft'
  const isSent = inv.status === 'sent'

  function handleSaveFields() {
    const data: { support_fees?: number; rolling_advance_current?: number } = {}
    if (isAdmin) data.support_fees = parseFloat(supportFees)
    data.rolling_advance_current = parseFloat(rollingCurrent)
    patchMutation.mutate(data)
  }

  const periodLabel = `${MONTHS[inv.period_month]} ${inv.period_year}`

  return (
    <div className="space-y-5">
      {saveError && (
        <p className="text-sm text-status-error bg-status-error/5 border border-status-error/20 rounded-lg px-4 py-2">
          {saveError}
        </p>
      )}

      {/* Header card */}
      <div className="bg-surface border border-border rounded-xl px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-lg font-bold text-text-primary font-mono">Invoice #{inv.invoice_number}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>
              {STATUS_LABELS[inv.status]}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
            <span>Period: {periodLabel}</span>
            <span>Created: {new Date(inv.created_at).toLocaleDateString()}</span>
            {inv.sent_at && <span>Sent: {new Date(inv.sent_at).toLocaleDateString()}</span>}
            {inv.paid_at && <span>Paid: {new Date(inv.paid_at).toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {inv.pdf_available && (
            <a
              href={getInvoicePdfUrl(invoiceId)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 text-sm font-medium rounded-lg border border-border text-text-secondary hover:border-brand-primary hover:text-brand-primary transition-colors"
            >
              Download PDF
            </a>
          )}
          {isAdmin && isDraft && (
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? 'Sending…' : 'Send Invoice'}
            </Button>
          )}
          {isAdmin && isSent && (
            <Button
              onClick={() => paidMutation.mutate()}
              disabled={paidMutation.isPending}
            >
              {paidMutation.isPending ? 'Saving…' : 'Mark as Paid'}
            </Button>
          )}
        </div>
      </div>

      {/* Amounts table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <span className="text-sm font-semibold text-text-primary">Invoice Breakdown</span>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-5 py-3 text-text-secondary">Support fees</td>
              <td className="px-5 py-3 font-mono text-text-primary text-right">€{inv.support_fees.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-text-secondary">Support expenses</td>
              <td className="px-5 py-3 font-mono text-text-primary text-right">€{inv.support_expenses.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-text-secondary">Rolling advance (current)</td>
              <td className="px-5 py-3 font-mono text-text-primary text-right">€{inv.rolling_advance_current.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-text-secondary">Rolling advance (previous)</td>
              <td className="px-5 py-3 font-mono text-status-error text-right">({inv.rolling_advance_previous.toFixed(2)})</td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-text-secondary">Previous balance</td>
              <td className="px-5 py-3 font-mono text-text-primary text-right">€{inv.previous_balance.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-text-secondary">Taxes</td>
              <td className="px-5 py-3 font-mono text-text-secondary text-right">€{inv.taxes.toFixed(2)}</td>
            </tr>
            <tr className="bg-bg-secondary font-semibold">
              <td className="px-5 py-3 text-text-primary">Total</td>
              <td className="px-5 py-3 font-mono text-text-primary text-right">€{inv.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Edit controls — draft only, admin or company */}
      {isDraft && isAdminOrCompany && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">Edit Invoice Fields</span>
          </div>
          <div className="px-5 py-4 space-y-4">
            {isAdmin && (
              <div className="space-y-1.5">
                <Label htmlFor="support-fees" className="text-xs">Support fees (€)</Label>
                <input
                  id="support-fees"
                  type="number"
                  step="0.01"
                  min="0"
                  className={`${INPUT_CLS} max-w-48`}
                  value={supportFees}
                  onChange={e => setSupportFees(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="rolling-current" className="text-xs">Rolling advance current (€)</Label>
              <input
                id="rolling-current"
                type="number"
                step="0.01"
                min="0"
                className={`${INPUT_CLS} max-w-48`}
                value={rollingCurrent}
                onChange={e => setRollingCurrent(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveFields}
                disabled={patchMutation.isPending}
              >
                {patchMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
