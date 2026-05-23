'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getInvoices, getCurrentInvoice } from '@/lib/data/invoices'
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

const NATIVE_SELECT_CLS =
  'h-8 rounded-lg border border-border bg-surface px-2.5 text-sm text-text-primary cursor-pointer outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30'

const PAGE_SIZE = 20

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className={`h-4 bg-bg-secondary rounded animate-pulse ${j === 0 ? 'w-16' : j === 5 ? 'w-12' : 'w-20'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <svg
        width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5"
        className="text-text-disabled mb-3"
      >
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
      </svg>
      <p className="text-sm font-semibold text-text-primary mb-1.5">
        {filtered ? 'No invoices' : 'No invoices yet'}
      </p>
      <p className="text-xs text-text-secondary max-w-[280px]">
        {filtered
          ? 'No invoices match the current filter.'
          : 'Invoices will appear here once created.'}
      </p>
    </div>
  )
}

export function InvoiceListView() {
  const router = useRouter()
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all')
  const [page, setPage] = useState(0)

  const isFiltered = status !== 'all'

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', status, page],
    queryFn: () => getInvoices({
      status: status === 'all' ? undefined : status,
      page,
      size: PAGE_SIZE,
    }),
  })

  const currentMutation = useMutation({
    mutationFn: getCurrentInvoice,
    onSuccess: (inv) => router.push('/invoices/' + inv.id),
  })

  const totalPages = data?.total_pages ?? 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Invoices</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {data ? `${data.total_elements} total` : ' '}
          </p>
        </div>
        <button
          onClick={() => currentMutation.mutate()}
          disabled={currentMutation.isPending}
          className="shrink-0 inline-flex items-center px-3.5 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {currentMutation.isPending ? 'Loading…' : 'Current Month'}
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select
          className={NATIVE_SELECT_CLS}
          value={status}
          onChange={e => { setStatus(e.target.value as InvoiceStatus | 'all'); setPage(0) }}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Invoice #</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Period</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Total</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <TableSkeleton />}
            {!isLoading && data?.content.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState filtered={isFiltered} />
                </td>
              </tr>
            )}
            {data?.content.map(inv => (
              <tr key={inv.id} className="hover:bg-bg-secondary transition-colors">
                <td className="px-4 py-3 font-mono text-text-primary">#{inv.invoice_number}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {MONTHS[inv.period_month]} {inv.period_year}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-text-primary">€{inv.total.toFixed(2)}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(inv.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border text-text-secondary hover:border-brand-primary hover:text-brand-primary transition-colors"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2 animate-pulse">
            <div className="flex justify-between">
              <div className="h-4 bg-bg-secondary rounded w-1/3" />
              <div className="h-5 bg-bg-secondary rounded-full w-16" />
            </div>
            <div className="h-3 bg-bg-secondary rounded w-2/4" />
          </div>
        ))}
        {!isLoading && data?.content.length === 0 && <EmptyState filtered={isFiltered} />}
        {data?.content.map(inv => (
          <Link key={inv.id} href={`/invoices/${inv.id}`}>
            <div className="bg-surface border border-border rounded-xl p-4 hover:border-brand-primary transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold font-mono text-text-primary">#{inv.invoice_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>
                  {STATUS_LABELS[inv.status]}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {MONTHS[inv.period_month]} {inv.period_year} · €{inv.total.toFixed(2)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-secondary hover:border-brand-primary hover:text-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">Page {page + 1} of {totalPages}</span>
          <button
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-secondary hover:border-brand-primary hover:text-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
