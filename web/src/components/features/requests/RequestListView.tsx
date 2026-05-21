'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getRequests } from '@/lib/data/requests'
import { getCustomers } from '@/lib/data/customers'
import { useAuthStore } from '@/lib/stores/authStore'
import type { RequestStatus, RequestType } from '@/types'

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  in_progress: 'In progress',
  done: 'Done',
}

const STATUS_BADGE: Record<RequestStatus, string> = {
  submitted: 'bg-status-info/10 text-status-info',
  in_progress: 'bg-status-warning/10 text-status-warning',
  done: 'bg-status-success/10 text-status-success',
}

const TYPE_LABELS: Record<RequestType, string> = {
  phone_repair: 'Phone repair',
  phone_replacement: 'Phone replacement',
  sim_topup: 'SIM top-up',
  new_sim: 'New SIM',
  manual_support: 'Manual support',
  onboarding: 'Onboarding',
}

const ALL_TYPES: RequestType[] = ['phone_repair', 'phone_replacement', 'sim_topup', 'new_sim', 'manual_support', 'onboarding']
const ALL_STATUSES: RequestStatus[] = ['submitted', 'in_progress', 'done']
const PAGE_SIZE = 20

const NATIVE_SELECT_CLS =
  'h-8 rounded-lg border border-border bg-surface px-2.5 text-sm text-text-primary cursor-pointer outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30'

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <svg
        width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5"
        className="text-text-disabled mb-3"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <p className="text-sm font-semibold text-text-primary mb-1.5">
        {filtered ? 'No requests' : 'No requests yet'}
      </p>
      <p className="text-xs text-text-secondary max-w-[280px]">
        {filtered
          ? 'No requests match the current filters.'
          : 'Submit a new service request to get started.'}
      </p>
      {!filtered && (
        <Link
          href="/requests/new"
          className="mt-4 inline-flex items-center px-4 py-2 bg-brand-primary text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          New request
        </Link>
      )}
    </div>
  )
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className={`h-4 bg-surface-raised rounded animate-pulse ${j === 0 ? 'w-28' : j === cols - 1 ? 'w-12' : 'w-20'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function RequestListView({ customerId }: { customerId?: string }) {
  const isAdminOrCompany = useAuthStore(s => s.isAdmin() || s.isCompany())
  const [status, setStatus] = useState<RequestStatus | 'all'>('all')
  const [type, setType] = useState<RequestType | 'all'>('all')
  const [filterCustomerId, setFilterCustomerId] = useState('')
  const [page, setPage] = useState(0)

  const isFiltered = status !== 'all' || type !== 'all' || !!filterCustomerId

  const { data, isLoading } = useQuery({
    queryKey: ['requests', status, type, filterCustomerId, page, customerId],
    queryFn: () => getRequests({
      status: status === 'all' ? undefined : status,
      type: type === 'all' ? undefined : type,
      customer_id: customerId ?? (filterCustomerId || undefined),
      page,
      size: PAGE_SIZE,
    }),
  })

  const { data: customers } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => getCustomers({ size: 200 }),
    enabled: isAdminOrCompany && !customerId,
  })

  const totalPages = data?.total_pages ?? 0
  const hasCustomerCol = isAdminOrCompany && !customerId
  const colCount = hasCustomerCol ? 7 : 6

  function pill(val: RequestStatus | 'all') {
    const active = status === val
    return (
      <button
        key={val}
        onClick={() => { setStatus(val); setPage(0) }}
        className={[
          'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
          active
            ? 'bg-brand-primary text-white'
            : 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-brand-primary',
        ].join(' ')}
      >
        {val === 'all' ? 'All' : STATUS_LABELS[val]}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {pill('all')}
          {ALL_STATUSES.map(s => pill(s))}
        </div>
        <div className="flex-1 hidden sm:block" />
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
        {isAdminOrCompany && !customerId && (
          <select
            className={NATIVE_SELECT_CLS}
            value={filterCustomerId}
            onChange={e => { setFilterCustomerId(e.target.value); setPage(0) }}
          >
            <option value="">All customers</option>
            {customers?.content.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Type</th>
              {hasCustomerCol && (
                <th className="px-4 py-3 text-left text-text-secondary font-medium">Customer</th>
              )}
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Author</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Status</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Fee</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <TableSkeleton cols={colCount} />}
            {!isLoading && data?.content.length === 0 && (
              <tr>
                <td colSpan={colCount}>
                  <EmptyState filtered={isFiltered} />
                </td>
              </tr>
            )}
            {data?.content.map(req => (
              <tr key={req.id} className="hover:bg-surface-raised transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/requests/${req.id}`}
                    className="text-brand-primary font-medium hover:underline"
                  >
                    {TYPE_LABELS[req.type] ?? req.type}
                  </Link>
                </td>
                {hasCustomerCol && (
                  <td className="px-4 py-3 text-text-secondary">{req.customer_name}</td>
                )}
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-raised border border-border text-text-secondary capitalize">
                    {req.author}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-text-secondary text-right">
                  {req.fee != null ? `€${req.fee.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {formatRelativeTime(req.created_at)}
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
            <div className="flex justify-between">
              <div className="h-4 bg-surface-raised rounded w-1/2" />
              <div className="h-5 bg-surface-raised rounded-full w-16" />
            </div>
            <div className="h-3 bg-surface-raised rounded w-3/4" />
          </div>
        ))}
        {!isLoading && data?.content.length === 0 && (
          <EmptyState filtered={isFiltered} />
        )}
        {data?.content.map(req => (
          <Link key={req.id} href={`/requests/${req.id}`}>
            <div className="bg-surface border border-border rounded-xl p-4 hover:border-brand-primary transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-text-primary">
                  {TYPE_LABELS[req.type] ?? req.type}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status]}`}>
                  {STATUS_LABELS[req.status]}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {req.customer_name} · by {req.author} · {formatRelativeTime(req.created_at)}
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
