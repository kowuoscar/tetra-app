'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getRequests } from '@/lib/data/requests'
import type { RequestType } from '@/types'

const TYPE_LABELS: Record<RequestType, string> = {
  phone_repair: 'Phone repair',
  phone_replacement: 'Phone replacement',
  sim_topup: 'SIM top-up',
  new_sim: 'New SIM',
  manual_support: 'Manual support',
  onboarding: 'Onboarding',
}

const ALL_TYPES: RequestType[] = ['phone_repair', 'phone_replacement', 'sim_topup', 'new_sim', 'manual_support', 'onboarding']
const PAGE_SIZE = 20

const NATIVE_SELECT_CLS =
  'h-8 rounded-lg border border-border bg-surface px-2.5 text-sm text-text-primary cursor-pointer outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30'

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <svg
        width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5"
        className="text-text-disabled mb-3"
      >
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      <p className="text-sm font-semibold text-text-primary mb-1.5">No completed requests</p>
      <p className="text-xs text-text-secondary max-w-[280px]">Completed requests will appear here.</p>
    </div>
  )
}

export function HistoryView() {
  const [type, setType] = useState<RequestType | 'all'>('all')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['history', type, page],
    queryFn: () => getRequests({
      status: 'done',
      type: type === 'all' ? undefined : type,
      page,
      size: PAGE_SIZE,
    }),
  })

  const totalPages = data?.total_pages ?? 0

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          className={NATIVE_SELECT_CLS}
          value={type}
          onChange={e => { setType(e.target.value as RequestType | 'all'); setPage(0) }}
        >
          <option value="all">All types</option>
          {ALL_TYPES.map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Type</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Customer</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Fee</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Done</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 5 }).map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className={`h-4 bg-surface-raised rounded animate-pulse ${j === 4 ? 'w-12' : 'w-20'}`} />
                  </td>
                ))}
              </tr>
            ))}
            {!isLoading && data?.content.length === 0 && (
              <tr>
                <td colSpan={5}><EmptyState /></td>
              </tr>
            )}
            {data?.content.map(req => (
              <tr key={req.id} className="hover:bg-surface-raised transition-colors">
                <td className="px-4 py-3 text-text-primary">{TYPE_LABELS[req.type] ?? req.type}</td>
                <td className="px-4 py-3 text-text-secondary">{req.customer_name}</td>
                <td className="px-4 py-3 font-mono text-text-secondary">
                  {req.fee != null ? `€${req.fee.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {req.done_at ? new Date(req.done_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/requests/${req.id}`}
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
            <div className="h-4 bg-surface-raised rounded w-1/2" />
            <div className="h-3 bg-surface-raised rounded w-3/4" />
          </div>
        ))}
        {!isLoading && data?.content.length === 0 && <EmptyState />}
        {data?.content.map(req => (
          <Link key={req.id} href={`/requests/${req.id}`}>
            <div className="bg-surface border border-border rounded-xl p-4 hover:border-brand-primary transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-text-primary">
                  {TYPE_LABELS[req.type] ?? req.type}
                </span>
                {req.fee != null && (
                  <span className="font-mono text-xs text-text-secondary">€{req.fee.toFixed(2)}</span>
                )}
              </div>
              <p className="text-xs text-text-secondary">
                {req.customer_name}
                {req.done_at && ` · Done ${new Date(req.done_at).toLocaleDateString()}`}
              </p>
            </div>
          </Link>
        ))}
      </div>

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
