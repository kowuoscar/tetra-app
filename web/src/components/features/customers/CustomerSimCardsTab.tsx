'use client'

import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/authStore'
import { getCustomerSimCards, getCustomerPhones, createSimCard, updateSimCard } from '@/lib/data/customers'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge, statusVariant } from '@/components/ui/badge'
import type { SimCardSummary, PhoneSummary } from '@/types'

const NATIVE_SELECT_CLS = 'h-8 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-text-primary cursor-pointer outline-none transition-colors focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/30 disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:opacity-50'

const TH = 'text-left px-3.5 py-2.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider border-b border-border bg-bg-secondary whitespace-nowrap'
const TD = 'px-3.5 py-3 align-middle text-text-primary'

export function CustomerSimCardsTab({ customerId }: { customerId: string }) {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [showCreate, setShowCreate] = useState(false)
  const [editingSim, setEditingSim] = useState<SimCardSummary | null>(null)
  const [assigningSimPhone, setAssigningSimPhone] = useState<SimCardSummary | null>(null)

  const qc = useQueryClient()
  const invalidateBoth = () => {
    qc.invalidateQueries({ queryKey: ['sim-cards', customerId] })
    qc.invalidateQueries({ queryKey: ['phones', customerId] })
  }

  const { data, isLoading } = useQuery({
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
                <th className={TH}>Provider</th>
                <th className={TH}>Number</th>
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
                  <td className={TD}>
                    {sim.provider ? (
                      <span className="text-text-primary capitalize">
                        {sim.provider.charAt(0) + sim.provider.slice(1).toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className={`${TD} font-mono text-xs`}>
                    {sim.number ?? <span className="text-text-secondary">—</span>}
                  </td>
                  <td className={`${TD} font-mono text-xs text-text-secondary`}>
                    {sim.type === 'postpaid' ? `€${sim.base_monthly_fee.toFixed(2)}/mo` : <span className="text-text-secondary">—</span>}
                  </td>
                  <td className={TD}>
                    {sim.phone_id ? (
                      <StatusBadge variant="brand" dot={false}>Assigned</StatusBadge>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className={TD}>
                    <StatusBadge variant={statusVariant(sim.status)}>
                      {sim.status.replace('_', ' ')}
                    </StatusBadge>
                  </td>
                  <td className={TD}>
                    {sim.is_unused ? (
                      <StatusBadge variant="warning">No phone</StatusBadge>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className={`${TD} text-right`}>
                      <div className="flex justify-end gap-1">
                        {!sim.phone_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2.5 py-1 text-xs h-auto"
                            onClick={() => setAssigningSimPhone(sim)}
                          >
                            Assign Phone
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2.5 py-1 text-xs h-auto"
                          onClick={() => setEditingSim(sim)}
                        >
                          Edit
                        </Button>
                      </div>
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
            invalidateBoth()
          }}
        />
      )}

      {editingSim && isAdmin && (
        <EditSimCardModal
          sim={editingSim}
          onClose={() => setEditingSim(null)}
          onSaved={() => {
            setEditingSim(null)
            invalidateBoth()
          }}
        />
      )}

      {assigningSimPhone && isAdmin && (
        <AssignPhoneModal
          customerId={customerId}
          sim={assigningSimPhone}
          onClose={() => setAssigningSimPhone(null)}
          onSaved={() => {
            setAssigningSimPhone(null)
            invalidateBoth()
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
  const [provider, setProvider] = useState('FREE')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const feeRaw = formData.get('base_monthly_fee') as string
    const phoneId = (formData.get('phone_id') as string).trim() || undefined
    const number = formData.get('number') as string

    try {
      await createSimCard(customerId, {
        type: simType,
        base_monthly_fee: simType === 'prepaid' ? 0 : parseFloat(feeRaw),
        phone_id: phoneId,
        provider,
        number,
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
            <Label htmlFor="sim_type">Type</Label>
            <select
              id="sim_type"
              value={simType}
              onChange={(e) => setSimType(e.target.value)}
              disabled={submitting}
              className={NATIVE_SELECT_CLS}
            >
              <option value="prepaid">Prepaid</option>
              <option value="postpaid">Postpaid</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim_provider">Provider</Label>
            <select
              id="sim_provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={submitting}
              className={NATIVE_SELECT_CLS}
            >
              <option value="FREE">Free</option>
              <option value="ORANGE">Orange</option>
              <option value="BOUYGUES">Bouygues</option>
              <option value="SFR">SFR</option>
              <option value="CORIOLIS">Coriolis</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="number">Phone number</Label>
            <Input
              id="number"
              name="number"
              placeholder="06 or 07 French mobile number"
              pattern="^(\+33|0033|0)[67]\d{8}$"
              required
              disabled={submitting}
            />
          </div>
          {simType === 'postpaid' && (
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
          )}
          <div className="space-y-1.5">
            <Label htmlFor="phone_id">Phone ID <span className="text-text-secondary font-normal">(optional)</span></Label>
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

function EditSimCardModal({
  sim,
  onClose,
  onSaved,
}: {
  sim: SimCardSummary
  onClose: () => void
  onSaved: () => void
}) {
  const [status, setStatus] = useState<SimCardSummary['status']>(sim.status)
  const [provider, setProvider] = useState<string>(sim.provider ?? 'FREE')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const feeRaw = formData.get('base_monthly_fee') as string
    const phoneIdRaw = (formData.get('phone_id') as string).trim()
    const number = (formData.get('number') as string).trim()

    try {
      await updateSimCard(sim.id, {
        base_monthly_fee: feeRaw ? parseFloat(feeRaw) : undefined,
        phone_id: phoneIdRaw || null,
        status,
        provider,
        number: number || undefined,
      })
      onSaved()
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to update SIM card')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit SIM Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit_sim_provider">Provider</Label>
            <select
              id="edit_sim_provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={submitting}
              className={NATIVE_SELECT_CLS}
            >
              <option value="FREE">Free</option>
              <option value="ORANGE">Orange</option>
              <option value="BOUYGUES">Bouygues</option>
              <option value="SFR">SFR</option>
              <option value="CORIOLIS">Coriolis</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit_number">Phone number</Label>
            <Input
              id="edit_number"
              name="number"
              defaultValue={sim.number ?? ''}
              placeholder="06 or 07 French mobile number"
              pattern="^(\+33|0033|0)[67]\d{8}$"
              disabled={submitting}
            />
          </div>
          {sim.type === 'postpaid' && (
            <div className="space-y-1.5">
              <Label htmlFor="edit_base_monthly_fee">Base monthly fee (€)</Label>
              <Input
                id="edit_base_monthly_fee"
                name="base_monthly_fee"
                type="number"
                step="0.01"
                min="0"
                defaultValue={sim.base_monthly_fee}
                disabled={submitting}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="edit_phone_id">Phone ID</Label>
            <Input
              id="edit_phone_id"
              name="phone_id"
              defaultValue={sim.phone_id ?? ''}
              placeholder="UUID or empty to unassign"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit_sim_status">Status</Label>
            <select
              id="edit_sim_status"
              value={status}
              onChange={(e) => setStatus(e.target.value as SimCardSummary['status'])}
              disabled={submitting}
              className={NATIVE_SELECT_CLS}
            >
              <option value="active">Active</option>
              <option value="unassigned">Unassigned</option>
              <option value="cancelled">Cancelled</option>
            </select>
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

function AssignPhoneModal({
  customerId,
  sim,
  onClose,
  onSaved,
}: {
  customerId: string
  sim: SimCardSummary
  onClose: () => void
  onSaved: () => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['phones-unassigned', customerId],
    queryFn: () => getCustomerPhones(customerId),
  })

  const unassigned = (data?.phones ?? []).filter((p) => p.sim_card === null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      await updateSimCard(sim.id, { phone_id: selected })
      onSaved()
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to assign phone')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Phone</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {isLoading ? (
            <p className="text-text-secondary text-sm">Loading…</p>
          ) : unassigned.length === 0 ? (
            <p className="text-text-secondary text-sm">No phones without a SIM available.</p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {unassigned.map((phone: PhoneSummary) => (
                <label
                  key={phone.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border cursor-pointer hover:bg-bg-secondary has-[:checked]:border-brand-primary has-[:checked]:bg-brand-secondary/30"
                >
                  <input
                    type="radio"
                    name="phone_id"
                    value={phone.id}
                    checked={selected === phone.id}
                    onChange={() => setSelected(phone.id)}
                    className="accent-brand-primary"
                  />
                  <span className="text-sm text-text-primary capitalize">
                    {phone.model} ({phone.ownership})
                  </span>
                </label>
              ))}
            </div>
          )}
          {error && <p className="text-status-error text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selected || unassigned.length === 0}>
              {submitting ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
