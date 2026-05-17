'use client'

import { useQuery } from '@tanstack/react-query'
import { getCustomerPhones } from '@/lib/data/customers'
import Link from 'next/link'
import type { PhoneSummary } from '@/types'

const STATUS_COLORS: Record<PhoneSummary['status'], string> = {
  active:    'bg-status-successBg text-status-success',
  in_repair: 'bg-status-warningBg text-status-warning',
  replaced:  'bg-bg-tertiary text-text-secondary',
}

const STATUS_LABELS: Record<PhoneSummary['status'], string> = {
  active:    'Active',
  in_repair: 'In Repair',
  replaced:  'Replaced',
}

export function PhonesView({ customerId }: { customerId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-phones', customerId],
    queryFn: () => getCustomerPhones(customerId, false),
  })

  if (isLoading) return <LoadingSkeleton />

  if (isError) {
    return (
      <div className="text-center py-16">
        <p className="text-status-error text-sm">Failed to load phones. Please try again.</p>
      </div>
    )
  }

  if (!data?.phones.length) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">No phones assigned to your account.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.phones.map(phone => (
        <div
          key={phone.id}
          className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-text-primary truncate">{phone.model}</p>
              <p className="text-xs text-text-secondary capitalize mt-0.5">{phone.ownership}-owned</p>
            </div>
            <span
              className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[phone.status]}`}
            >
              {STATUS_LABELS[phone.status]}
            </span>
          </div>

          {phone.is_unused && (
            <div className="bg-status-warningBg border border-amber-200 rounded-md px-3 py-2 text-xs text-status-warning">
              No SIM card assigned
            </div>
          )}

          {phone.sim_card && (
            <p className="text-xs text-text-secondary">
              SIM: {phone.sim_card.type} &middot; &euro;{phone.sim_card.base_monthly_fee.toFixed(2)}/mo
            </p>
          )}

          <Link
            href={`/requests/new?phone_id=${phone.id}&customer_id=${customerId}`}
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
        <div key={i} className="h-44 bg-bg-tertiary rounded-xl animate-pulse" />
      ))}
    </div>
  )
}
