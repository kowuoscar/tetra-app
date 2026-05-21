'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getRequests } from '@/lib/data/requests'

const TYPE_LABELS: Record<string, string> = {
  phone_repair: 'Phone Repair',
  phone_replacement: 'Phone Replacement',
  sim_topup: 'SIM Top-Up',
  new_sim: 'New SIM',
  manual_support: 'Manual Support',
  onboarding: 'Onboarding',
}
const STATUS_COLORS: Record<string, string> = {
  submitted: 'text-status-warning',
  in_progress: 'text-status-info',
  done: 'text-status-success',
}
const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  in_progress: 'In Progress',
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
    return <p className="text-sm text-text-secondary py-4">Loading…</p>
  }

  if (!data?.content.length) {
    return (
      <p className="text-sm text-text-secondary py-4">
        {doneOnly ? 'No completed requests.' : 'No requests yet.'}
      </p>
    )
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden text-sm">
      <table className="w-full">
        <thead className="bg-surface-raised border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-text-secondary font-medium">Type</th>
            <th className="px-4 py-3 text-left text-text-secondary font-medium">Status</th>
            <th className="px-4 py-3 text-left text-text-secondary font-medium">Fee</th>
            {doneOnly && (
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Time spent</th>
            )}
            <th className="px-4 py-3 text-left text-text-secondary font-medium">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.content.map(req => (
            <tr key={req.id} className="hover:bg-surface-raised transition-colors">
              <td className="px-4 py-3 text-text-primary">{TYPE_LABELS[req.type] ?? req.type}</td>
              <td className={`px-4 py-3 font-medium ${STATUS_COLORS[req.status] ?? ''}`}>
                {STATUS_LABELS[req.status] ?? req.status}
              </td>
              <td className="px-4 py-3 text-text-primary">
                {req.fee != null ? `€${req.fee.toFixed(2)}` : '—'}
              </td>
              {doneOnly && (
                <td className="px-4 py-3 text-text-secondary">—</td>
              )}
              <td className="px-4 py-3 text-text-secondary">
                {new Date(req.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/requests/${req.id}`} className="text-brand-primary hover:underline font-medium">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
