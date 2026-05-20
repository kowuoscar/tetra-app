'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/authStore'
import { Button } from '@/components/ui/button'
import { CustomerPhonesTab } from './CustomerPhonesTab'
import { CustomerSimCardsTab } from './CustomerSimCardsTab'
import { CustomerCostBreakdownTab } from './CustomerCostBreakdownTab'
import type { CustomerDetail } from '@/types'

type Tab = 'phones' | 'sims' | 'requests' | 'costs' | 'time'

const ALL_TABS: { id: Tab; label: string; adminOnly?: boolean }[] = [
  { id: 'phones', label: 'Phones' },
  { id: 'sims', label: 'SIM Cards' },
  { id: 'requests', label: 'Requests' },
  { id: 'costs', label: 'Cost Breakdown' },
  { id: 'time', label: 'Time Tracking', adminOnly: true },
]

export function CustomerDetailView({ customer }: { customer: CustomerDetail }) {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [activeTab, setActiveTab] = useState<Tab>('phones')

  const tabs = ALL_TABS.filter((t) => !t.adminOnly || isAdmin)

  return (
    <div>
      {/* Header card */}
      <div className="bg-surface border border-border rounded-lg px-6 py-5 mb-5 flex items-start justify-between">
        <div>
          <div className="text-xl font-bold text-text-primary mb-1">{customer.name}</div>
          <div className="flex flex-wrap gap-4 text-sm text-text-secondary mt-0.5">
            <span>{customer.contact_info}</span>
            <span>{customer.phone_count} phones</span>
            <span>{customer.sim_card_count} SIM cards</span>
            <span className="text-status-warning">{customer.open_request_count} open requests</span>
            <span className="text-text-disabled">
              €{customer.current_month_cost.toFixed(2)}/mo current
            </span>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2 shrink-0 ml-4">
            <Button variant="outline" size="sm">Edit</Button>
            <Button size="sm">New request</Button>
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-border mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
              activeTab === tab.id
                ? 'text-brand-primary border-brand-primary'
                : 'text-text-secondary border-transparent hover:text-text-primary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'phones' && <CustomerPhonesTab customerId={customer.id} />}
      {activeTab === 'sims' && <CustomerSimCardsTab customerId={customer.id} />}
      {activeTab === 'requests' && (
        <p className="text-text-secondary text-sm">Requests coming in plan-03.</p>
      )}
      {activeTab === 'costs' && <CustomerCostBreakdownTab customerId={customer.id} />}
      {activeTab === 'time' && isAdmin && (
        <p className="text-text-secondary text-sm">Time tracking coming in plan-03.</p>
      )}
    </div>
  )
}
