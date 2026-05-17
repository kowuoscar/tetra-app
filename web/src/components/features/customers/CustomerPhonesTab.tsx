'use client'

import { useState } from 'react'
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

export function CustomerPhonesTab({ customerId }: { customerId: string }) {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [showCreate, setShowCreate] = useState(false)

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['phones', customerId],
    queryFn: () => getCustomerPhones(customerId),
  })

  if (isLoading) {
    return <p className="text-text-secondary text-sm mt-4">Loading…</p>
  }

  return (
    <div className="mt-4 space-y-3">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            Add Phone
          </Button>
        </div>
      )}

      {data?.phones.length === 0 && (
        <p className="text-text-secondary text-sm">No phones assigned.</p>
      )}

      <div className="space-y-2">
        {data?.phones.map((phone) => (
          <div
            key={phone.id}
            className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{phone.model}</p>
              <p className="text-xs text-text-secondary capitalize">{phone.ownership}</p>
            </div>
            <Badge className={STATUS_CLASSES[phone.status]}>
              {phone.status.replace('_', ' ')}
            </Badge>
            {phone.is_unused && (
              <Badge className="bg-status-warningBg text-status-warning">No SIM</Badge>
            )}
            {phone.sim_card && (
              <span className="text-xs text-text-secondary">{phone.sim_card.type}</span>
            )}
          </div>
        ))}
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    <Dialog open onOpenChange={onClose}>
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
            <Select value={ownership} onValueChange={setOwnership} disabled={submitting}>
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
