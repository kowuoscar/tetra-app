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

export function CustomerSimCardsTab({ customerId }: { customerId: string }) {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [showCreate, setShowCreate] = useState(false)

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['sim-cards', customerId],
    queryFn: () => getCustomerSimCards(customerId),
  })

  if (isLoading) {
    return <p className="text-text-secondary text-sm mt-4">Loading…</p>
  }

  return (
    <div className="mt-4 space-y-3">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            Add SIM
          </Button>
        </div>
      )}

      {data?.sim_cards.length === 0 && (
        <p className="text-text-secondary text-sm">No SIM cards assigned.</p>
      )}

      <div className="space-y-2">
        {data?.sim_cards.map((sim) => (
          <div
            key={sim.id}
            className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary capitalize">{sim.type}</p>
              <p className="text-xs text-text-secondary font-mono">
                €{sim.base_monthly_fee.toFixed(2)}/mo
              </p>
            </div>
            <Badge className={STATUS_CLASSES[sim.status]}>
              {sim.status.replace('_', ' ')}
            </Badge>
            {sim.is_unused && (
              <Badge className="bg-status-warningBg text-status-warning">No phone</Badge>
            )}
          </div>
        ))}
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
