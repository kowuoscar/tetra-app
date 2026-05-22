'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createRequest } from '@/lib/data/requests'
import { createCustomer, getCustomers, getCustomerPhones, getCustomerSimCards } from '@/lib/data/customers'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { RequestType, SimProvider } from '@/types'

const NATIVE_SELECT_CLS =
  'h-8 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-text-primary cursor-pointer outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-50'

const INPUT_CLS =
  'h-8 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 disabled:opacity-50'

const TEXTAREA_CLS =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 disabled:opacity-50 resize-none'

const REQUEST_TYPES: { value: RequestType; label: string }[] = [
  { value: 'phone_repair',      label: 'Phone Repair' },
  { value: 'phone_replacement', label: 'Phone Replacement' },
  { value: 'sim_topup',         label: 'SIM Top-Up' },
  { value: 'new_sim',           label: 'New SIM' },
  { value: 'manual_support',    label: 'Manual Support' },
  { value: 'onboarding',        label: 'Onboarding' },
]

const SIM_PROVIDERS: { value: SimProvider; label: string }[] = [
  { value: 'FREE',     label: 'Free' },
  { value: 'ORANGE',   label: 'Orange' },
  { value: 'BOUYGUES', label: 'Bouygues' },
  { value: 'SFR',      label: 'SFR' },
  { value: 'CORIOLIS', label: 'Coriolis' },
]

const PHONE_TYPES: RequestType[] = ['phone_repair', 'phone_replacement']
const SIM_TYPES: RequestType[] = ['sim_topup']

interface Props {
  initialPhoneId?: string
  initialSimCardId?: string
  initialCustomerId?: string
  userRole: string
  onCancel?: () => void
  embedded?: boolean
}

export function NewRequestForm({ initialPhoneId, initialSimCardId, initialCustomerId, userRole, onCancel, embedded }: Props) {
  const router = useRouter()
  const isCustomer = userRole === 'customer'

  const [type, setType] = useState<RequestType>('phone_repair')
  const [customerId, setCustomerId] = useState(initialCustomerId ?? '')
  const [phoneId, setPhoneId] = useState(initialPhoneId ?? '')
  const [simCardId, setSimCardId] = useState(initialSimCardId ?? '')
  const [notes, setNotes] = useState('')

  // new_sim fields
  const [simProvider, setSimProvider] = useState<SimProvider | ''>('')
  const [simType, setSimType] = useState<'prepaid' | 'postpaid' | ''>('')

  // onboarding fields (new customer)
  const [onboardingName, setOnboardingName] = useState('')
  const [onboardingContact, setOnboardingContact] = useState('')
  const [onboardingWhatsapp, setOnboardingWhatsapp] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => getCustomers({ size: 200 }),
    enabled: !isCustomer && type !== 'onboarding',
  })

  const needsPhone = PHONE_TYPES.includes(type)
  const needsSim = SIM_TYPES.includes(type)

  const { data: phonesData } = useQuery({
    queryKey: ['phones-for-request', customerId],
    queryFn: () => getCustomerPhones(customerId),
    enabled: !!customerId && needsPhone,
  })

  const { data: simsData } = useQuery({
    queryKey: ['sims-for-request', customerId],
    queryFn: () => getCustomerSimCards(customerId),
    enabled: !!customerId && needsSim,
  })

  // Filter: active phones WITH a SIM card attached
  const eligiblePhones = (phonesData?.phones ?? []).filter(
    p => p.status === 'active' && p.sim_card !== null
  )

  // Filter: active SIM cards attached to a phone
  const eligibleSims = (simsData?.sim_cards ?? []).filter(
    s => s.status === 'active' && s.phone_id !== null
  )

  const effectiveCustomerId = isCustomer ? (initialCustomerId ?? '') : customerId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (type === 'onboarding') {
      if (!onboardingName.trim()) { setError('Customer name is required'); return }
    } else {
      if (!effectiveCustomerId) { setError('Customer is required'); return }
      if (needsPhone && !phoneId) { setError('Phone is required for this request type'); return }
      if (needsSim && !simCardId) { setError('SIM card is required for this request type'); return }
    }

    setSubmitting(true)
    try {
      let resolvedCustomerId = effectiveCustomerId

      if (type === 'onboarding') {
        const customer = await createCustomer({
          name: onboardingName.trim(),
          contact_info: onboardingContact.trim() || undefined,
          whatsapp_group_id: onboardingWhatsapp.trim() || undefined,
        })
        resolvedCustomerId = customer.id
      }

      let resolvedNotes = notes.trim() || undefined
      if (type === 'new_sim') {
        const parts = [
          simProvider ? `Provider: ${simProvider}` : null,
          simType ? `Type: ${simType}` : null,
          notes.trim() || null,
        ].filter(Boolean).join('\n')
        resolvedNotes = parts || undefined
      }

      const req = await createRequest({
        customer_id: resolvedCustomerId,
        type,
        notes: resolvedNotes,
        phone_id: phoneId || undefined,
        sim_card_id: simCardId || undefined,
      })
      router.push(`/requests/${req.id}`)
      // modal callers: navigation unmounts the modal naturally
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Submission failed')
      setSubmitting(false)
    }
  }

  // Reset phone/SIM when customer changes
  function handleCustomerChange(val: string) {
    setCustomerId(val)
    setPhoneId('')
    setSimCardId('')
  }

  // Reset contextual fields when type changes
  function handleTypeChange(val: RequestType) {
    setType(val)
    setPhoneId('')
    setSimCardId('')
    setSimProvider('')
    setSimType('')
    setOnboardingName('')
    setOnboardingContact('')
    setOnboardingWhatsapp('')
  }

  const isOnboarding = type === 'onboarding'
  const isNewSim = type === 'new_sim'

  const fields = (
    <div className={embedded ? 'space-y-5' : 'px-6 py-5 space-y-5'}>
      {/* Type + Customer row */}
      <div className={`grid gap-4 ${!isCustomer && !isOnboarding ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
        <div className="space-y-1.5">
          <Label htmlFor="type">Request type</Label>
          <select
            id="type"
            className={NATIVE_SELECT_CLS}
            value={type}
            onChange={e => handleTypeChange(e.target.value as RequestType)}
          >
            {REQUEST_TYPES.map(rt => (
              <option key={rt.value} value={rt.value}>{rt.label}</option>
            ))}
          </select>
        </div>

        {!isCustomer && !isOnboarding && (
          <div className="space-y-1.5">
            <Label htmlFor="customer">Customer</Label>
            <select
              id="customer"
              className={NATIVE_SELECT_CLS}
              value={customerId}
              onChange={e => handleCustomerChange(e.target.value)}
              disabled={customersLoading}
            >
              <option value="">
                {customersLoading ? 'Loading…' : 'Select customer'}
              </option>
              {customers?.content.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Phone (required for phone_repair / phone_replacement) */}
      {needsPhone && !isCustomer && (
        <div className="space-y-1.5">
          <Label htmlFor="phone">
            Phone
            {' '}<span className="text-text-disabled text-xs font-normal">(required for this type)</span>
          </Label>
          <select
            id="phone"
            className={NATIVE_SELECT_CLS}
            value={phoneId}
            onChange={e => setPhoneId(e.target.value)}
            disabled={!customerId}
          >
            <option value="">{customerId ? 'Select phone' : 'Select customer first'}</option>
            {eligiblePhones.map(p => (
              <option key={p.id} value={p.id}>
                {p.model}
                {p.sim_card ? ` — ${p.sim_card.provider ?? ''} ${p.sim_card.number ?? ''}`.trim() : ''}
              </option>
            ))}
          </select>
          {customerId && eligiblePhones.length === 0 && phonesData && (
            <p className="text-xs text-status-warning">No active phones with an attached SIM found for this customer.</p>
          )}
        </div>
      )}

      {/* SIM Card (required for sim_topup) */}
      {needsSim && !isCustomer && (
        <div className="space-y-1.5">
          <Label htmlFor="sim">
            SIM Card
            {' '}<span className="text-text-disabled text-xs font-normal">(required for this type)</span>
          </Label>
          <select
            id="sim"
            className={NATIVE_SELECT_CLS}
            value={simCardId}
            onChange={e => setSimCardId(e.target.value)}
            disabled={!customerId}
          >
            <option value="">{customerId ? 'Select SIM card' : 'Select customer first'}</option>
            {eligibleSims.map(s => (
              <option key={s.id} value={s.id}>
                {s.type} — {s.provider ?? 'Unknown'}{s.number ? ` · ${s.number}` : ''} · €{s.base_monthly_fee}/mo
              </option>
            ))}
          </select>
          {customerId && eligibleSims.length === 0 && simsData && (
            <p className="text-xs text-status-warning">No active SIM cards assigned to a phone found for this customer.</p>
          )}
        </div>
      )}

      {/* New SIM fields */}
      {isNewSim && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="simProvider">Provider</Label>
            <select
              id="simProvider"
              className={NATIVE_SELECT_CLS}
              value={simProvider}
              onChange={e => setSimProvider(e.target.value as SimProvider | '')}
            >
              <option value="">Select provider</option>
              {SIM_PROVIDERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="simTypeSel">SIM type</Label>
            <select
              id="simTypeSel"
              className={NATIVE_SELECT_CLS}
              value={simType}
              onChange={e => setSimType(e.target.value as 'prepaid' | 'postpaid' | '')}
            >
              <option value="">Select type</option>
              <option value="prepaid">Prepaid</option>
              <option value="postpaid">Postpaid</option>
            </select>
          </div>
        </div>
      )}

      {/* Onboarding: new customer fields */}
      {isOnboarding && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Fill in the new customer details. A customer account will be created on submit.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="onboardName">
              Customer name <span className="text-status-error">*</span>
            </Label>
            <input
              id="onboardName"
              type="text"
              className={INPUT_CLS}
              value={onboardingName}
              onChange={e => setOnboardingName(e.target.value)}
              placeholder="e.g. TechCorp ME"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onboardContact">Contact info</Label>
            <input
              id="onboardContact"
              type="text"
              className={INPUT_CLS}
              value={onboardingContact}
              onChange={e => setOnboardingContact(e.target.value)}
              placeholder="Email, phone, or other contact"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onboardWhatsapp">WhatsApp group ID</Label>
            <input
              id="onboardWhatsapp"
              type="text"
              className={INPUT_CLS}
              value={onboardingWhatsapp}
              onChange={e => setOnboardingWhatsapp(e.target.value)}
              placeholder="Optional — enables WhatsApp notifications"
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">
          {isOnboarding ? 'Provisioning notes' : isNewSim ? 'Additional notes' : 'Notes'}
          {' '}<span className="text-text-disabled text-xs font-normal">(optional)</span>
        </Label>
        <textarea
          id="notes"
          className={TEXTAREA_CLS}
          rows={4}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={
            isOnboarding
              ? 'Phones and SIM cards to provision, special instructions…'
              : isNewSim
              ? 'Any additional instructions…'
              : 'Describe the issue or request…'
          }
        />
      </div>

      {error && (
        <p className="text-sm text-status-error bg-status-error/5 border border-status-error/20 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={() => onCancel ? onCancel() : router.push('/requests')}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Submit request
        </Button>
      </div>
    </div>
  )

  if (embedded) {
    return <form onSubmit={handleSubmit}>{fields}</form>
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-bg-secondary">
          <h2 className="text-sm font-semibold text-text-primary">Request details</h2>
        </div>
        {fields}
      </div>
    </form>
  )
}
