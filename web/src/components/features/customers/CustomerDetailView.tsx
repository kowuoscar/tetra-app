'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/stores/authStore'
import { CustomerPhonesTab } from './CustomerPhonesTab'
import { CustomerSimCardsTab } from './CustomerSimCardsTab'
import { CustomerCostBreakdownTab } from './CustomerCostBreakdownTab'
import type { CustomerDetail } from '@/types'

export function CustomerDetailView({ customer }: { customer: CustomerDetail }) {
  const isAdmin = useAuthStore((s) => s.isAdmin())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{customer.name}</h1>
        <p className="text-sm text-text-secondary mt-1">{customer.contact_info}</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-sm">
        <span className="text-text-secondary">{customer.phone_count} phones</span>
        <span className="text-text-secondary">{customer.sim_card_count} SIM cards</span>
        <span className="text-text-secondary">{customer.open_request_count} open requests</span>
        <span className="text-text-secondary font-mono">
          €{customer.current_month_cost.toFixed(2)} this month
        </span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="phones">
        <TabsList>
          <TabsTrigger value="phones">Phones</TabsTrigger>
          <TabsTrigger value="sims">SIM Cards</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
          {isAdmin && <TabsTrigger value="time">Time Tracking</TabsTrigger>}
        </TabsList>

        <TabsContent value="phones">
          <CustomerPhonesTab customerId={customer.id} />
        </TabsContent>
        <TabsContent value="sims">
          <CustomerSimCardsTab customerId={customer.id} />
        </TabsContent>
        <TabsContent value="requests">
          <p className="text-text-secondary text-sm mt-4">Requests coming in plan-03.</p>
        </TabsContent>
        <TabsContent value="costs">
          <CustomerCostBreakdownTab customerId={customer.id} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="time">
            <p className="text-text-secondary text-sm mt-4">
              Time tracking coming in plan-03.
            </p>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
