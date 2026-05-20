'use client'

import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/authStore'
import { getCustomerSimCards, createSimCard } from '@/lib/data/customers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SimCardSummary } from '@/types'

const STATUS_CLASSES: Record<SimCardSummary['status'], string> = {
  active: 'bg-status-successBg text-status-success',
  unassigned: 'bg-bg-tertiary text-text-secondary',
  cancelled: 'bg-bg-tertiary text-text-secondary',
}

const TH = 'text-left px-3.5 py-2.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider border-b border-border bg-bg-secondary whitespace-nowrap'
const TD = 'px-3.5 py-3 align-middle text-text-primary'

export function CustomerSimCardsTab({ customerId }: { customerId: string }) {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [showCreate, setShowCreate] = useState(false)

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['sim-cards', customerId],
    queryFn: () => getCustomerSimCards(customerId),
  })

  if (isLoading) {
    return <p className="text-text-secondary text-sm">Loading…</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-sm font-semibold text-text-primary">SIM Cards</span>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>+ Add SIM</Button>
        )}
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {data?.sim_cards.length === 0 ? (
          <p className="text-text-secondary text-sm p-4">No SIM cards assigned.</p>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={TH}>Type</th>
                <th className={TH}>Base Fee</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Status</th>
                <th className={TH}>Flags</th>
                {isAdmin && <th className={TH}></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.sim_cards.map((sim) => (
                <tr key={sim.id} className="hover:bg-bg-secondary">
                  <td className={`${TD} capitalize`}>
                    <span className="text-brand-primary font-medium">{sim.type}</span>
                  </td>
                  <td className={`${TD} font-mono text-xs text-text-secondary`}>
                    €{sim.base_monthly_fee.toFixed(2)}/mo
                  </td>
                  <td className={TD}>
                    {sim.phone_id ? (
                      <Badge className="bg-brand-secondary text-brand-primary">Assigned</Badge>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className={TD}>
                    <Badge className={STATUS_CLASSES[sim.status]}>
                      {sim.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className={TD}>
                    {sim.is_unused ? (
                      <Badge className="bg-status-warningBg text-status-warning">No phone</Badge>
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
        <CreateSimCardModal
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

function CreateSimCardModal({
  customerId,
  onClose,
  onCreated,
}: {
  customerId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [simType, setSimType] = useState('prepaid')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const feeRaw = formData.get('base_monthly_fee') as string
    const phoneId = (formData.get('phone_id') as string).trim() || undefined

    try {
      await createSimCard(customerId, {
        type: simType,
        base_monthly_fee: parseFloat(feeRaw),
        phone_id: phoneId,
      })
      onCreated()
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to add SIM card')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add SIM Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={simType} onValueChange={(v) => v && setSimType(v)} disabled={submitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prepaid">Prepaid</SelectItem>
                <SelectItem value="postpaid">Postpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="base_monthly_fee">Base monthly fee (€)</Label>
            <Input
              id="base_monthly_fee"
              name="base_monthly_fee"
              type="number"
              step="0.01"
              min="0"
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone_id">Phone ID (optional)</Label>
            <Input
              id="phone_id"
              name="phone_id"
              placeholder="UUID of phone to assign"
              disabled={submitting}
            />
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
