'use client'

import { useQuery } from '@tanstack/react-query'
import { getCustomerSimCards } from '@/lib/data/customers'
import Link from 'next/link'
import type { SimCardSummary } from '@/types'

const STATUS_COLORS: Record<SimCardSummary['status'], string> = {
  active:     'bg-status-successBg text-status-success',
  unassigned: 'bg-status-warningBg text-status-warning',
  cancelled:  'bg-bg-tertiary text-text-secondary',
}

const STATUS_LABELS: Record<SimCardSummary['status'], string> = {
  active:     'Active',
  unassigned: 'Unassigned',
  cancelled:  'Cancelled',
}

export function SimCardsView({ customerId }: { customerId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-sim-cards', customerId],
    queryFn: () => getCustomerSimCards(customerId, false),
  })

  if (isLoading) return <LoadingSkeleton />

  if (isError) {
    return (
      <div className="text-center py-16">
        <p className="text-status-error text-sm">Failed to load SIM cards. Please try again.</p>
      </div>
    )
  }

  if (!data?.sim_cards.length) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">No SIM cards assigned to your account.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.sim_cards.map(sim => (
        <div
          key={sim.id}
          className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-text-primary capitalize">{sim.type}</p>
              <p className="text-xs text-text-secondary mt-0.5">
                &euro;{sim.base_monthly_fee.toFixed(2)}/mo
              </p>
            </div>
            <span
              className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[sim.status]}`}
            >
              {STATUS_LABELS[sim.status]}
            </span>
          </div>

          {sim.is_unused && (
            <div className="bg-status-warningBg border border-status-warningBg rounded-md px-3 py-2 text-xs text-status-warning">
              No phone assigned
            </div>
          )}

          <Link
            href={`/requests/new?sim_card_id=${sim.id}&customer_id=${customerId}`}
            className="block text-center text-sm font-medium text-brand-primary border border-brand-primary rounded-md py-2 hover:bg-brand-secondary transition-colors duration-normal"
          >
            Submit Request
          </Link>
        </div>
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-40 bg-bg-tertiary rounded-xl animate-pulse" />
      ))}
    </div>
  )
}
