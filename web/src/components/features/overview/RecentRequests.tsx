'use client'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getRequests } from '@/lib/data/requests'
import type { RequestStatus } from '@/types'

const STATUS_BADGE: Record<RequestStatus, string> = {
  submitted:   'bg-status-info/10 text-status-info',
  in_progress: 'bg-status-warning/10 text-status-warning',
  done:        'bg-status-success/10 text-status-success',
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted:   'Submitted',
  in_progress: 'In progress',
  done:        'Done',
}

const TYPE_LABELS: Record<string, string> = {
  phone_repair:      'Phone repair',
  phone_replacement: 'Phone replacement',
  sim_topup:         'SIM top-up',
  new_sim:           'New SIM',
  manual_support:    'Manual support',
  onboarding:        'Onboarding',
}

export function RecentRequests({ openCount }: { openCount: number }) {
  const router = useRouter()
  const { data, isLoading } = useQuery({
    queryKey: ['recent-requests'],
    queryFn: () => getRequests({ size: 5 }),
    refetchInterval: 60_000,
  })

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Recent requests</h2>
        {openCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-status-warning/10 text-status-warning">
            {openCount} open
          </span>
        )}
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-bg-secondary border-b border-border">
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Type</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Customer</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-4 py-3"><div className="h-4 bg-bg-secondary rounded w-24 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 bg-bg-secondary rounded w-28 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-5 bg-bg-secondary rounded-full w-20 animate-pulse" /></td>
            </tr>
          ))}
          {!isLoading && !data?.content.length && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-xs text-text-secondary">No requests yet.</td>
            </tr>
          )}
          {data?.content.map(req => (
            <tr
              key={req.id}
              onClick={() => router.push(`/requests/${req.id}`)}
              className="border-b border-border last:border-0 hover:bg-bg-secondary transition-colors cursor-pointer"
            >
              <td className="px-4 py-3 text-text-primary">{TYPE_LABELS[req.type] ?? req.type}</td>
              <td className="px-4 py-3 text-text-secondary">{req.customer_name}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status]}`}>
                  {STATUS_LABELS[req.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
