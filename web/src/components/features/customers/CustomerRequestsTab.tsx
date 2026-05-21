'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getRequests } from '@/lib/data/requests'

const TYPE_LABELS: Record<string, string> = {
  phone_repair: 'Phone repair',
  phone_replacement: 'Phone replacement',
  sim_topup: 'SIM top-up',
  new_sim: 'New SIM',
  manual_support: 'Manual support',
  onboarding: 'Onboarding',
}

const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-status-info/10 text-status-info',
  in_progress: 'bg-status-warning/10 text-status-warning',
  done: 'bg-status-success/10 text-status-success',
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  in_progress: 'In progress',
  done: 'Done',
}

interface Props {
  customerId: string
  doneOnly?: boolean
}

export function CustomerRequestsTab({ customerId, doneOnly }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-requests', customerId, doneOnly],
    queryFn: () => getRequests({
      customer_id: customerId,
      status: doneOnly ? 'done' : undefined,
      size: 50,
    }),
  })

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <div className="h-4 bg-surface-raised rounded w-1/3" />
              <div className="h-5 bg-surface-raised rounded-full w-20" />
            </div>
            <div className="h-3 bg-surface-raised rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (!data?.content.length) {
    return (
      <div className="flex flex-col items-center text-center py-10 px-6">
        <svg
          width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5"
          className="text-text-disabled mb-3"
        >
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <p className="text-sm font-semibold text-text-primary mb-1.5">
          {doneOnly ? 'No completed requests' : 'No requests yet'}
        </p>
        <p className="text-xs text-text-secondary max-w-[260px]">
          {doneOnly
            ? 'Completed requests will appear here.'
            : 'This customer has no open requests right now. Submit one to get started.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Desktop table */}
      <div className="hidden sm:block border border-border rounded-xl overflow-hidden text-sm">
        <table className="w-full">
          <thead className="bg-surface-raised border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Type</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Status</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Fee</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.content.map(req => (
              <tr key={req.id} className="hover:bg-surface-raised transition-colors">
                <td className="px-4 py-3 text-text-primary">{TYPE_LABELS[req.type] ?? req.type}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status] ?? ''}`}>
                    {STATUS_LABELS[req.status] ?? req.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-text-secondary">
                  {req.fee != null ? `€${req.fee.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(req.created_at).toLocaleDateString()}
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

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {data.content.map(req => (
          <Link key={req.id} href={`/requests/${req.id}`}>
            <div className="bg-surface border border-border rounded-xl p-4 hover:border-brand-primary transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-text-primary">
                  {TYPE_LABELS[req.type] ?? req.type}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status] ?? ''}`}>
                  {STATUS_LABELS[req.status] ?? req.status}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {new Date(req.created_at).toLocaleDateString()}
                {req.fee != null && ` · €${req.fee.toFixed(2)}`}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
