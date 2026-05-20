'use client'

import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/authStore'
import { getCustomerPhones, createPhone } from '@/lib/data/customers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PhoneSummary } from '@/types'

const STATUS_CLASSES: Record<PhoneSummary['status'], string> = {
  active: 'bg-status-successBg text-status-success',
  in_repair: 'bg-status-warningBg text-status-warning',
  replaced: 'bg-bg-tertiary text-text-secondary',
}

const TH = 'text-left px-3.5 py-2.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider border-b border-border bg-bg-secondary whitespace-nowrap'
const TD = 'px-3.5 py-3 align-middle text-text-primary'

export function CustomerPhonesTab({ customerId }: { customerId: string }) {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [showCreate, setShowCreate] = useState(false)

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['phones', customerId],
    queryFn: () => getCustomerPhones(customerId),
  })

  if (isLoading) {
    return <p className="text-text-secondary text-sm">Loading…</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-sm font-semibold text-text-primary">Phones</span>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>+ Add phone</Button>
        )}
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {data?.phones.length === 0 ? (
          <p className="text-text-secondary text-sm p-4">No phones assigned.</p>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={TH}>Model</th>
                <th className={TH}>Ownership</th>
                <th className={TH}>SIM Card</th>
                <th className={TH}>Status</th>
                <th className={TH}>Flags</th>
                {isAdmin && <th className={TH}></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.phones.map((phone) => (
                <tr key={phone.id} className="hover:bg-bg-secondary">
                  <td className={TD}>
                    <span className="text-brand-primary font-medium">{phone.model}</span>
                  </td>
                  <td className={`${TD} text-text-secondary capitalize`}>
                    {phone.ownership}
                  </td>
                  <td className={TD}>
                    {phone.sim_card ? (
                      <Badge className="bg-brand-secondary text-brand-primary">
                        {phone.sim_card.type} · €{phone.sim_card.base_monthly_fee.toFixed(2)}/mo
                      </Badge>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className={TD}>
                    <Badge className={STATUS_CLASSES[phone.status]}>
                      {phone.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className={TD}>
                    {phone.is_unused ? (
                      <Badge className="bg-status-warningBg text-status-warning">No SIM</Badge>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className={`${TD} text-right`}>
                      <Button variant="ghost" size="sm" className="px-2.5 py-1 text-xs h-auto">
                        Edit
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && isAdmin && (
        <CreatePhoneModal
          customerId={customerId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}

function CreatePhoneModal({
  customerId,
  onClose,
  onCreated,
}: {
  customerId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [ownership, setOwnership] = useState('customer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    try {
      await createPhone(customerId, {
        model: formData.get('model') as string,
        ownership,
      })
      onCreated()
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to add phone')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Phone</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" required disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label>Ownership</Label>
            <Select value={ownership} onValueChange={(v) => v && setOwnership(v)} disabled={submitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-status-error text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
