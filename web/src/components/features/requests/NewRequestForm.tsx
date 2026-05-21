'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createRequest } from '@/lib/data/requests'
import { getCustomers, getCustomerPhones, getCustomerSimCards } from '@/lib/data/customers'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { RequestType } from '@/types'

const REQUEST_TYPES: { value: RequestType; label: string; icon: string }[] = [
  { value: 'phone_repair',      label: 'Phone Repair',      icon: '🔧' },
  { value: 'phone_replacement', label: 'Phone Replacement', icon: '📱' },
  { value: 'sim_topup',         label: 'SIM Top-Up',        icon: '📶' },
  { value: 'new_sim',           label: 'New SIM',           icon: '💳' },
  { value: 'manual_support',    label: 'Manual Support',    icon: '🎧' },
  { value: 'onboarding',        label: 'Onboarding',        icon: '🚀' },
]

const PHONE_TYPES: RequestType[] = ['phone_repair', 'phone_replacement']
const SIM_TYPES: RequestType[]   = ['sim_topup']

interface Props {
  initialPhoneId?: string
  initialSimCardId?: string
  initialCustomerId?: string
  userRole: string
}

export function NewRequestForm({
  initialPhoneId, initialSimCardId, initialCustomerId, userRole,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [type, setType] = useState<RequestType | null>(null)
  const [customerId, setCustomerId] = useState(initialCustomerId ?? '')
  const [phoneId, setPhoneId] = useState(initialPhoneId ?? '')
  const [simCardId, setSimCardId] = useState(initialSimCardId ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCustomer = userRole === 'customer'

  const { data: customers } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => getCustomers({ size: 100 }),
    enabled: !isCustomer && step === 2,
  })

  const { data: phones } = useQuery({
    queryKey: ['phones-for-request', customerId],
    queryFn: () => getCustomerPhones(customerId),
    enabled: !!customerId && type !== null && PHONE_TYPES.includes(type),
  })

  const { data: simCards } = useQuery({
    queryKey: ['sims-for-request', customerId],
    queryFn: () => getCustomerSimCards(customerId),
    enabled: !!customerId && type !== null && SIM_TYPES.includes(type),
  })

  async function handleSubmit() {
    if (!type || !customerId) return
    setSubmitting(true)
    setError(null)
    try {
      const req = await createRequest({
        customer_id: customerId,
        type,
        notes: notes.trim() || undefined,
        phone_id: phoneId || undefined,
        sim_card_id: simCardId || undefined,
      })
      router.push(`/requests/${req.id}`)
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? 'Submission failed'
      setError(msg)
      setSubmitting(false)
    }
  }

  if (step === 1) {
    return (
      <div className="space-y-4 max-w-2xl">
        <p className="text-text-secondary text-sm">Select request type</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {REQUEST_TYPES.map(rt => (
            <button
              key={rt.value}
              onClick={() => { setType(rt.value); setStep(2) }}
              className="flex flex-col items-center gap-2 p-5 bg-surface border border-border rounded-xl hover:border-brand-primary hover:bg-brand-secondary transition-colors text-center"
            >
              <span className="text-2xl">{rt.icon}</span>
              <span className="text-sm font-medium text-text-primary">{rt.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="space-y-5 max-w-lg">
        <p className="text-sm text-text-secondary font-medium">
          {REQUEST_TYPES.find(r => r.value === type)?.label}
        </p>

        {!isCustomer && (
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={v => setCustomerId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers?.content.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {type && PHONE_TYPES.includes(type) && customerId && (
          <div className="space-y-1.5">
            <Label>Phone (optional)</Label>
            <Select value={phoneId} onValueChange={v => setPhoneId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Select phone" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {phones?.phones.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {type && SIM_TYPES.includes(type) && customerId && (
          <div className="space-y-1.5">
            <Label>SIM Card (optional)</Label>
            <Select value={simCardId} onValueChange={v => setSimCardId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Select SIM" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {simCards?.sim_cards.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.type} · €{s.base_monthly_fee}/mo</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Describe the issue or request…"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
          <Button
            onClick={() => setStep(3)}
            disabled={!isCustomer && !customerId}
          >
            Next
          </Button>
        </div>
      </div>
    )
  }

  const customerName = isCustomer
    ? 'Your account'
    : customers?.content.find(c => c.id === customerId)?.name ?? customerId

  return (
    <div className="space-y-5 max-w-lg">
      <div className="bg-surface border border-border rounded-xl p-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Type</span>
          <span className="font-medium text-text-primary capitalize">
            {REQUEST_TYPES.find(r => r.value === type)?.label}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Customer</span>
          <span className="text-text-primary">{customerName}</span>
        </div>
        {notes && (
          <div>
            <span className="text-text-secondary">Notes</span>
            <p className="text-text-primary mt-1 whitespace-pre-wrap">
              {notes.slice(0, 200)}{notes.length > 200 ? '…' : ''}
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-status-error">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Request'}
        </Button>
      </div>
    </div>
  )
}
