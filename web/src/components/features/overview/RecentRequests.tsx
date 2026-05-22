'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getRequests } from '@/lib/data/requests'
import type { RequestStatus } from '@/types'

const STATUS_BADGE: Record<RequestStatus, string> = {
  submitted: 'bg-status-info/10 text-status-info',
  in_progress: 'bg-status-warning/10 text-status-warning',
  done: 'bg-status-success/10 text-status-success',
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  in_progress: 'In progress',
  done: 'Done',
}

const TYPE_LABELS: Record<string, string> = {
  phone_repair: 'Phone repair',
  phone_replacement: 'Phone replacement',
  sim_topup: 'SIM top-up',
  new_sim: 'New SIM',
  manual_support: 'Manual support',
  onboarding: 'Onboarding',
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function RecentRequests() {
  const { data, isLoading } = useQuery({
    queryKey: ['recent-requests'],
    queryFn: () => getRequests({ size: 5 }),
    refetchInterval: 60_000,
  })

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Recent Requests</h2>
        <Link href="/requests" className="text-xs text-brand-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="divide-y divide-border">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
            <div className="h-4 bg-bg-secondary rounded w-28 flex-1" />
            <div className="h-5 bg-bg-secondary rounded-full w-20" />
            <div className="h-3 bg-bg-secondary rounded w-12" />
          </div>
        ))}
        {!isLoading && (!data?.content.length) && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-text-secondary">No requests yet.</p>
          </div>
        )}
        {data?.content.map(req => (
          <Link
            key={req.id}
            href={`/requests/${req.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary font-medium truncate">
                {TYPE_LABELS[req.type] ?? req.type}
              </p>
              <p className="text-xs text-text-secondary truncate">{req.customer_name}</p>
            </div>
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status]}`}>
              {STATUS_LABELS[req.status]}
            </span>
            <span className="shrink-0 text-xs text-text-disabled w-14 text-right">
              {formatRelativeTime(req.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
