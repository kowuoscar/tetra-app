'use client'

import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/authStore'
import { getCustomerPhones, getCustomerSimCards, createPhone, updatePhone, updateSimCard } from '@/lib/data/customers'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge, statusVariant } from '@/components/ui/badge'
import type { PhoneSummary, SimCardSummary } from '@/types'

const NATIVE_SELECT_CLS = 'h-8 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-text-primary cursor-pointer outline-none transition-colors focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/30 disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:opacity-50'

const TH = 'text-left px-3.5 py-2.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider border-b border-border bg-bg-secondary whitespace-nowrap'
const TD = 'px-3.5 py-3 align-middle text-text-primary'

export function CustomerPhonesTab({ customerId }: { customerId: string }) {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [showCreate, setShowCreate] = useState(false)
  const [editingPhone, setEditingPhone] = useState<PhoneSummary | null>(null)
  const [assigningPhone, setAssigningPhone] = useState<PhoneSummary | null>(null)
  const [unassigningSimId, setUnassigningSimId] = useState<string | null>(null)

  const qc = useQueryClient()
  const invalidateBoth = () => {
    qc.invalidateQueries({ queryKey: ['phones', customerId] })
    qc.invalidateQueries({ queryKey: ['sim-cards', customerId] })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['phones', customerId],
    queryFn: () => getCustomerPhones(customerId),
  })

  if (isLoading) {
    return <p className="text-text-secondary text-sm">Loading…</p>
  }

  return (
    <div>
      {/* Desktop section header */}
      <div className="hidden sm:flex items-center justify-between mb-3.5">
        <span className="text-sm font-semibold text-text-primary">Phones</span>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>+ Add phone</Button>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden flex flex-col gap-2">
        {data?.phones.length === 0 ? (
          <p className="text-text-secondary text-sm py-4">No phones assigned.</p>
        ) : (
          data?.phones.map((phone) => (
            <div
              key={phone.id}
              className={`bg-surface border rounded-xl p-3.5 ${
                phone.is_unused ? 'border-status-warning' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-text-primary">{phone.model}</div>
                  <div className="text-xs text-text-secondary mt-0.5 capitalize">
                    {phone.ownership}-owned
                  </div>
                </div>
                <StatusBadge variant={statusVariant(phone.status)}>
                  {phone.status.replace('_', ' ')}
                </StatusBadge>
              </div>
              <div className="mt-2 text-xs">
                {phone.sim_card ? (
                  <span className="text-text-secondary">
                    {`SIM: ${phone.sim_card.type.charAt(0).toUpperCase() + phone.sim_card.type.slice(1)}${phone.sim_card.type === 'postpaid' ? ` · €${phone.sim_card.base_monthly_fee.toFixed(2)}/mo` : ''}`}
                  </span>
                ) : phone.is_unused ? (
                  <span className="text-status-warning">⚠ No SIM assigned</span>
                ) : (
                  <span className="text-text-secondary">No SIM assigned</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-surface border border-border rounded-lg overflow-hidden">
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
                      <StatusBadge variant="brand" dot={false}>
                        {phone.sim_card.provider && <span className="capitalize">{phone.sim_card.provider.charAt(0) + phone.sim_card.provider.slice(1).toLowerCase()}</span>}
                        {phone.sim_card.provider && ' · '}
                        {phone.sim_card.number && <span className="font-mono">{phone.sim_card.number}</span>}
                        {phone.sim_card.number && ' · '}
                        <span className="capitalize">{phone.sim_card.type}</span>
                        {phone.sim_card.type === 'postpaid' && ` · €${phone.sim_card.base_monthly_fee.toFixed(2)}/mo`}
                      </StatusBadge>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className={TD}>
                    <StatusBadge variant={statusVariant(phone.status)}>
                      {phone.status.replace('_', ' ')}
                    </StatusBadge>
                  </td>
                  <td className={TD}>
                    {phone.is_unused ? (
                      <StatusBadge variant="warning">⚠ No SIM assigned</StatusBadge>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className={`${TD} text-right`}>
                      <div className="flex justify-end gap-1">
                        {!phone.sim_card && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2.5 py-1 text-xs h-auto"
                            onClick={() => setAssigningPhone(phone)}
                          >
                            Assign SIM
                          </Button>
                        )}
                        {phone.sim_card && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2.5 py-1 text-xs h-auto text-status-error hover:text-status-error"
                            onClick={() => setUnassigningSimId(phone.sim_card!.id)}
                          >
                            Unassign SIM
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2.5 py-1 text-xs h-auto"
                          onClick={() => setEditingPhone(phone)}
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
        <CreatePhoneModal
          customerId={customerId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            invalidateBoth()
          }}
        />
      )}

      {editingPhone && isAdmin && (
        <EditPhoneModal
          phone={editingPhone}
          onClose={() => setEditingPhone(null)}
          onSaved={() => {
            setEditingPhone(null)
            invalidateBoth()
          }}
        />
      )}

      {assigningPhone && isAdmin && (
        <AssignSimModal
          customerId={customerId}
          phone={assigningPhone}
          onClose={() => setAssigningPhone(null)}
          onSaved={() => {
            setAssigningPhone(null)
            invalidateBoth()
          }}
        />
      )}

      {unassigningSimId && isAdmin && (
        <UnassignSimConfirm
          simCardId={unassigningSimId}
          onClose={() => setUnassigningSimId(null)}
          onDone={() => {
            setUnassigningSimId(null)
            invalidateBoth()
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
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <DialogTitle>Add Phone</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 bg-status-errorBg border border-status-error/20 text-status-error rounded-lg px-4 py-3 text-sm">
                <svg className="shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="model">
                Model <span className="text-status-error">*</span>
              </Label>
              <Input id="model" name="model" required disabled={submitting} placeholder="e.g. iPhone 15 Pro" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ownership">
                Ownership <span className="text-status-error">*</span>
              </Label>
              <select
                id="ownership"
                value={ownership}
                onChange={(e) => setOwnership(e.target.value)}
                disabled={submitting}
                className={NATIVE_SELECT_CLS}
              >
                <option value="customer">Customer</option>
                <option value="company">Company</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-bg-secondary">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Phone'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditPhoneModal({
  phone,
  onClose,
  onSaved,
}: {
  phone: PhoneSummary
  onClose: () => void
  onSaved: () => void
}) {
  const [ownership, setOwnership] = useState<PhoneSummary['ownership']>(phone.ownership)
  const [status, setStatus] = useState<PhoneSummary['status']>(phone.status)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    try {
      await updatePhone(phone.id, {
        model: formData.get('model') as string,
        ownership,
        status,
      })
      onSaved()
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to update phone')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Phone</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit_model">Model</Label>
            <Input id="edit_model" name="model" defaultValue={phone.model} required disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit_ownership">Ownership</Label>
            <select
              id="edit_ownership"
              value={ownership}
              onChange={(e) => setOwnership(e.target.value as PhoneSummary['ownership'])}
              disabled={submitting}
              className={NATIVE_SELECT_CLS}
            >
              <option value="customer">Customer</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit_status">Status</Label>
            <select
              id="edit_status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PhoneSummary['status'])}
              disabled={submitting}
              className={NATIVE_SELECT_CLS}
            >
              <option value="active">Active</option>
              <option value="in_repair">In repair</option>
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

function AssignSimModal({
  customerId,
  phone,
  onClose,
  onSaved,
}: {
  customerId: string
  phone: PhoneSummary
  onClose: () => void
  onSaved: () => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sim-cards-unassigned', customerId],
    queryFn: () => getCustomerSimCards(customerId),
  })

  const unassigned = (data?.sim_cards ?? []).filter((s) => s.status === 'unassigned')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      await updateSimCard(selected, { phone_id: phone.id })
      onSaved()
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to assign SIM card')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign SIM Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {isLoading ? (
            <p className="text-text-secondary text-sm">Loading…</p>
          ) : unassigned.length === 0 ? (
            <p className="text-text-secondary text-sm">No unassigned SIM cards available.</p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {unassigned.map((sim: SimCardSummary) => (
                <label
                  key={sim.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border cursor-pointer hover:bg-bg-secondary has-[:checked]:border-brand-primary has-[:checked]:bg-brand-secondary/30"
                >
                  <input
                    type="radio"
                    name="sim_id"
                    value={sim.id}
                    checked={selected === sim.id}
                    onChange={() => setSelected(sim.id)}
                    className="accent-brand-primary"
                  />
                  <span className="text-sm text-text-primary capitalize">
                    {sim.provider && <span>{sim.provider.charAt(0) + sim.provider.slice(1).toLowerCase()} · </span>}
                    {sim.number && <span className="font-mono">{sim.number} · </span>}
                    {sim.type}
                    {sim.type === 'postpaid' && ` · €${sim.base_monthly_fee.toFixed(2)}/mo`}
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

function UnassignSimConfirm({
  simCardId,
  onClose,
  onDone,
}: {
  simCardId: string
  onClose: () => void
  onDone: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    try {
      await updateSimCard(simCardId, { phone_id: null })
      onDone()
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to unassign SIM card')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Unassign SIM Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-text-secondary">Remove SIM card assignment from this phone?</p>
          {error && <p className="text-status-error text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Unassigning…' : 'Unassign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
