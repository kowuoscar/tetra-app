'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getRequests } from '@/lib/data/requests'
import { useAuthStore } from '@/lib/stores/authStore'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { RequestStatus, RequestType } from '@/types'

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  in_progress: 'In Progress',
  done: 'Done',
}
const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted: 'text-status-warning',
  in_progress: 'text-status-info',
  done: 'text-status-success',
}
const TYPE_LABELS: Record<RequestType, string> = {
  phone_repair: 'Phone Repair',
  phone_replacement: 'Phone Replacement',
  sim_topup: 'SIM Top-Up',
  new_sim: 'New SIM',
  manual_support: 'Manual Support',
  onboarding: 'Onboarding',
}

const ALL_STATUSES: RequestStatus[] = ['submitted', 'in_progress', 'done']
const ALL_TYPES: RequestType[] = ['phone_repair', 'phone_replacement', 'sim_topup', 'new_sim', 'manual_support', 'onboarding']
const PAGE_SIZE = 20

export function RequestListView({ customerId }: { customerId?: string }) {
  const isAdminOrCompany = useAuthStore(s => s.isAdmin() || s.isCompany())
  const [status, setStatus] = useState<RequestStatus | 'all'>('all')
  const [type, setType] = useState<RequestType | 'all'>('all')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['requests', status, type, page, customerId],
    queryFn: () => getRequests({
      status: status === 'all' ? undefined : status,
      type: type === 'all' ? undefined : type,
      customer_id: customerId,
      page,
      size: PAGE_SIZE,
    }),
  })

  const totalPages = data ? data.total_pages : 0

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Select value={status} onValueChange={v => { setStatus((v ?? 'all') as RequestStatus | 'all'); setPage(0) }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={v => { setType((v ?? 'all') as RequestType | 'all'); setPage(0) }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ALL_TYPES.map(t => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Type</th>
              {isAdminOrCompany && !customerId && (
                <th className="px-4 py-3 text-left text-text-secondary font-medium">Customer</th>
              )}
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Status</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Fee</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">Loading…</td>
              </tr>
            )}
            {!isLoading && data?.content.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">No requests found</td>
              </tr>
            )}
            {data?.content.map(req => (
              <tr key={req.id} className="hover:bg-surface-raised transition-colors">
                <td className="px-4 py-3 text-text-primary">{TYPE_LABELS[req.type]}</td>
                {isAdminOrCompany && !customerId && (
                  <td className="px-4 py-3 text-text-primary">{req.customer_name}</td>
                )}
                <td className={`px-4 py-3 font-medium ${STATUS_COLORS[req.status]}`}>
                  {STATUS_LABELS[req.status]}
                </td>
                <td className="px-4 py-3 text-text-primary">
                  {req.fee != null ? `€${req.fee.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(req.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/requests/${req.id}`}
                    className="text-brand-primary hover:underline font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-text-secondary">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
