'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/authStore'
import { updateCustomer } from '@/lib/data/customers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CustomerPhonesTab } from './CustomerPhonesTab'
import { CustomerSimCardsTab } from './CustomerSimCardsTab'
import { CustomerCostBreakdownTab } from './CustomerCostBreakdownTab'
import { CustomerRequestsTab } from './CustomerRequestsTab'
import { NewRequestModal } from '@/components/features/requests/NewRequestModal'
import type { CustomerDetail } from '@/types'

type Tab = 'phones' | 'sims' | 'requests' | 'costs' | 'time'

const ALL_TABS: { id: Tab; label: string; mobileLabel: string; adminOnly?: boolean }[] = [
  { id: 'phones',   label: 'Phones',         mobileLabel: 'Phones'   },
  { id: 'sims',     label: 'SIM Cards',       mobileLabel: 'SIMs'     },
  { id: 'requests', label: 'Requests',        mobileLabel: 'Requests' },
  { id: 'costs',    label: 'Cost Breakdown',  mobileLabel: 'Costs'    },
  { id: 'time',     label: 'Time Tracking',   mobileLabel: 'Time',    adminOnly: true },
]

export function CustomerDetailView({ customer }: { customer: CustomerDetail }) {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [activeTab, setActiveTab] = useState<Tab>('phones')
  const [showEdit, setShowEdit] = useState(false)
  const [showNewRequest, setShowNewRequest] = useState(false)

  const tabs = ALL_TABS.filter((t) => !t.adminOnly || isAdmin)

  const formattedCost = new Intl.NumberFormat('en-US').format(Math.round(customer.current_month_cost))

  return (
    <div>
      {/* Desktop header card */}
      <div className="hidden sm:flex bg-surface border border-border rounded-lg px-6 py-5 mb-5 items-start justify-between">
        <div>
          <div className="text-xl font-bold text-text-primary mb-1 uppercase">{customer.name}</div>
          <div className="flex flex-wrap gap-4 text-sm text-text-secondary mt-0.5">
            {customer.contact_info && <span>{customer.contact_info}</span>}
            <span>{customer.phone_count} phones</span>
            <span>{customer.sim_card_count} SIM cards</span>
            <span className={customer.open_request_count > 0 ? 'text-status-warning' : ''}>
              {customer.open_request_count} open requests
            </span>
            <span className="text-text-disabled">€{formattedCost}/mo current</span>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2 shrink-0 ml-4">
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
              Edit
            </Button>
            <Button size="sm" onClick={() => setShowNewRequest(true)}>
              New request
            </Button>
          </div>
        )}
      </div>

      {/* Mobile header — full-bleed, shows customer name + Edit + stats */}
      <div className="sm:hidden -mx-4 mb-0">
        <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
          <span className="text-sm font-semibold text-text-primary uppercase">{customer.name}</span>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>Edit</Button>
          )}
        </div>
        <div className="px-4 py-2.5 bg-surface border-b border-border text-xs text-text-secondary flex flex-wrap gap-x-1.5">
          {customer.contact_info && <><span>{customer.contact_info}</span><span>·</span></>}
          <span>{customer.phone_count} phones</span>
          <span>·</span>
          <span>{customer.sim_card_count} SIMs</span>
          <span>·</span>
          <span className={customer.open_request_count > 0 ? 'text-status-warning' : ''}>
            {customer.open_request_count} open
          </span>
        </div>
      </div>

      {/* Tab nav — full-bleed on mobile */}
      <div className="-mx-4 sm:mx-0 flex overflow-x-auto border-b border-border mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
              'sm:text-sm text-xs',
              activeTab === tab.id
                ? 'text-brand-primary border-brand-primary'
                : 'text-text-secondary border-transparent hover:text-text-primary',
            )}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.mobileLabel}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'phones' && <CustomerPhonesTab customerId={customer.id} />}
      {activeTab === 'sims' && <CustomerSimCardsTab customerId={customer.id} />}
      {activeTab === 'requests' && <CustomerRequestsTab customerId={customer.id} />}
      {activeTab === 'costs' && <CustomerCostBreakdownTab customerId={customer.id} />}
      {activeTab === 'time' && isAdmin && (
        <CustomerRequestsTab customerId={customer.id} doneOnly />
      )}

      {showEdit && isAdmin && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setShowEdit(false)}
        />
      )}
      <NewRequestModal
        open={showNewRequest}
        onOpenChange={setShowNewRequest}
        initialCustomerId={customer.id}
      />
    </div>
  )
}

function EditCustomerModal({
  customer,
  onClose,
}: {
  customer: CustomerDetail
  onClose: () => void
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      await updateCustomer(customer.id, {
        name: (fd.get('name') as string).trim(),
        contact_info: (fd.get('contact_info') as string).trim(),
        whatsapp_group_id: (fd.get('whatsapp_group_id') as string).trim(),
      })
      onClose()
      router.refresh()
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to update customer')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={customer.name}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_info">Contact info</Label>
            <Input
              id="contact_info"
              name="contact_info"
              defaultValue={customer.contact_info}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp_group_id">WhatsApp group ID</Label>
            <Input
              id="whatsapp_group_id"
              name="whatsapp_group_id"
              defaultValue={customer.whatsapp_group_id}
              disabled={submitting}
            />
          </div>
          {error && <p className="text-status-error text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
