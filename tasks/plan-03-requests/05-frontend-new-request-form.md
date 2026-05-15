# Frontend — New Request Form

## Domain

frontend

## Plan

`plans/plan-03-requests.md`

## Depends on

- `tasks/plan-03-requests/02-backend-request-service.md` — POST /requests deployed

## References

- `specs/frontend.md#new-request-form` — route, steps, field rules
- `docs/contracts.md#post-requests`

## Context

Multi-step form at `/requests/new`. Query params `phone_id` and `customer_id` pre-fill step 1 (from My Phones / customer detail "Submit Request" links). Three steps: Request Type → Details → Confirm. Customer submits for own account only; admin/company can submit for any customer.

---

### Inlined spec excerpts

**Route:** `/requests/new` — all roles

**Query params:** `phone_id?`, `sim_card_id?`, `customer_id?` (pre-fill from calling context)

**Step 1 — Request type:**
- Six tiles: Phone Repair, Phone Replacement, SIM Top-Up, New SIM, Manual Support, Onboarding
- Click tile → advance to step 2
- API value: `phone_repair | phone_replacement | sim_topup | new_sim | manual_support | onboarding`

**Step 2 — Details:**
- `customer_id` — admin/company: searchable select from customer list; customer: hidden (own id)
- `phone_id` — shown for: phone_repair, phone_replacement; select from customer's phones
- `sim_card_id` — shown for: sim_topup; select from customer's SIM cards
- `description` — textarea, required
- Back button → step 1

**Step 3 — Confirm:**
- Summary of: type, customer name, description preview
- Submit → POST /requests → on success redirect to `/requests/{newId}`
- Back button → step 2

**Errors:** 422 or 403 → show inline error, stay on step 3

---

## Implementation

### 1. Types

Add to `src/types/index.ts`:
```typescript
export type RequestType =
  | 'phone_repair' | 'phone_replacement' | 'sim_topup'
  | 'new_sim' | 'manual_support' | 'onboarding'

export type RequestStatus = 'submitted' | 'in_progress' | 'done'

export type AttachmentSummary = {
  id: string
  uploaded_by_user_id: string
  created_at: string
}

export type RequestSummary = {
  id: string
  customer_id: string
  customer_name: string
  type: RequestType
  status: RequestStatus
  author: 'customer' | 'company'
  fee: number | null      // admin-set directly on request (not sum of parts)
  created_at: string
  done_at: string | null
}

export type RequestPart = { id: string; description: string; cost: number }

export type RequestDetail = RequestSummary & {
  notes: string | null    // field is 'notes', not 'description'
  phone_id: string | null
  sim_card_id: string | null
  updated_at: string
  parts: RequestPart[]
  attachments: AttachmentSummary[]
  time_spent_minutes: number | null
}
```

### 2. Data functions

Add to `src/lib/data/requests.ts`:
```typescript
import { apiClient } from '@/lib/api/client'
import type { RequestDetail, RequestSummary, PagedResponse, RequestType, RequestStatus } from '@/types'

export async function createRequest(data: {
  customer_id: string
  type: RequestType
  notes?: string
  phone_id?: string
  sim_card_id?: string
}): Promise<RequestDetail> {
  return apiClient('/requests', { method: 'POST', body: JSON.stringify(data) })
}

export async function getRequests(params: {
  status?: RequestStatus
  type?: RequestType
  customer_id?: string
  page?: number
  size?: number
}): Promise<PagedResponse<RequestSummary>> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.type) qs.set('type', params.type)
  if (params.customer_id) qs.set('customer_id', params.customer_id)
  if (params.page !== undefined) qs.set('page', String(params.page))
  if (params.size !== undefined) qs.set('size', String(params.size))
  return apiClient(`/requests?${qs}`)
}

export async function getRequest(id: string): Promise<RequestDetail> {
  return apiClient(`/requests/${id}`)
}
```

### 3. Page

`src/app/(main)/requests/new/page.tsx` — Server Component:
```tsx
import { getMe } from '@/lib/data/auth'
import { NewRequestForm } from '@/components/features/requests/NewRequestForm'

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: { phone_id?: string; sim_card_id?: string; customer_id?: string }
}) {
  const user = await getMe()
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">New Request</h1>
      <NewRequestForm
        initialPhoneId={searchParams.phone_id}
        initialSimCardId={searchParams.sim_card_id}
        initialCustomerId={searchParams.customer_id ?? (user?.customer_id ?? undefined)}
        userRole={user?.role ?? 'customer'}
        userId={user?.customer_id ?? undefined}
      />
    </div>
  )
}
```

### 4. NewRequestForm — `"use client"`

`src/components/features/requests/NewRequestForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createRequest } from '@/lib/data/requests'
import { getCustomers } from '@/lib/data/customers'
import { getCustomerPhones, getCustomerSimCards } from '@/lib/data/customers'
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
  userId?: string
}

export function NewRequestForm({
  initialPhoneId, initialSimCardId, initialCustomerId, userRole, userId,
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
            <Select value={customerId} onValueChange={setCustomerId}>
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
            <Select value={phoneId} onValueChange={setPhoneId}>
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
            <Select value={simCardId} onValueChange={setSimCardId}>
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

  // Step 3 — confirm
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
```

---

## Acceptance criteria

- [ ] Step 1: six request type tiles render, click advances to step 2
- [ ] Step 2: customer select shown for admin/company; hidden for customer
- [ ] Phone select shown only for phone_repair / phone_replacement
- [ ] SIM select shown only for sim_topup
- [ ] Description required to proceed from step 2
- [ ] Step 3 shows summary; submit calls POST /requests; success redirects to `/requests/{id}`
- [ ] Query params `phone_id`, `customer_id` pre-fill step 2
- [ ] `pnpm build` exits 0, no type errors

## Automated checks

```bash
cd web
pnpm tsc --noEmit
pnpm build
```
