# Frontend — Customer Detail Page

## Domain

frontend

## Plan

`plans/plan-02-customers-assets.md`

## Depends on

- `tasks/plan-02-customers-assets/02-backend-aggregations.md` — GET /customers/{id}, GET /customers/{id}/phones, GET /customers/{id}/sim-cards, GET /customers/{id}/cost-breakdown all deployed

## References

- `specs/frontend.md#customer-detail` — route, tabs, components, states
- `docs/contracts.md#get-customersid` through `GET /customers/{id}/cost-breakdown`

## Context

Build `/customers/[id]` with a five-tab layout. This task delivers: Phones tab (phone cards with create modal for admin), SIM Cards tab (SIM rows with create modal for admin), Cost Breakdown tab (SIM fee line items + total). Requests tab and Time Tracking tab are placeholders — wired in plan-03.

---

### Inlined spec excerpts

**Route:** `/customers/[id]` — admin, company, customer (own only)

**PhoneSummary type:**
```typescript
type PhoneSummary = {
  id: string; model: string
  ownership: 'customer' | 'company'
  status: 'active' | 'in_repair' | 'replaced'
  customer_id: string
  sim_card: { id: string; type: 'prepaid'|'postpaid'; base_monthly_fee: number } | null
  is_unused: boolean
  created_at: string
}
```

**SimCardSummary type:**
```typescript
type SimCardSummary = {
  id: string; type: 'prepaid' | 'postpaid'
  base_monthly_fee: number
  status: 'active' | 'unassigned' | 'cancelled'
  customer_id: string; phone_id: string | null
  is_unused: boolean; created_at: string
}
```

**CostBreakdown type:**
```typescript
type CostBreakdown = {
  period_month: number; period_year: number
  sim_fees: Array<{ sim_card_id: string; sim_card_type: string; amount: number; is_actual: boolean }>
  request_fees: Array<{ request_id: string; request_type: string; amount: number }>
  total: number
}
```

**Tabs:** Phones | SIM Cards | Requests (placeholder) | Cost Breakdown | Time Tracking (admin only, placeholder)

**is_unused badge:** amber badge labeled "No SIM" (for phones) or "No phone" (for SIMs) when `is_unused=true`.

**Status badge colors:**
- active → green
- in_repair → amber
- replaced / cancelled / unassigned → slate

---

## Implementation

### 1. Types

Add to `src/types/index.ts`:
```typescript
export type PhoneSummary = { /* as above */ }
export type SimCardSummary = { /* as above */ }
export type CostBreakdown = { /* as above */ }
```

### 2. Data fetching

Add to `src/lib/data/customers.ts`:
```typescript
export async function getCustomer(id: string): Promise<CustomerDetail> {
  return apiClient(`/customers/${id}`)
}
export async function getCustomerPhones(id: string, includeReplaced = false): Promise<{ phones: PhoneSummary[] }> {
  return apiClient(`/customers/${id}/phones?include_replaced=${includeReplaced}`)
}
export async function getCustomerSimCards(id: string, includeCancelled = false): Promise<{ sim_cards: SimCardSummary[] }> {
  return apiClient(`/customers/${id}/sim-cards?include_cancelled=${includeCancelled}`)
}
export async function getCostBreakdown(id: string, month: number, year: number): Promise<CostBreakdown> {
  return apiClient(`/customers/${id}/cost-breakdown?month=${month}&year=${year}`)
}
export async function createPhone(customerId: string, data: { model: string; ownership: string }): Promise<PhoneSummary> {
  return apiClient(`/customers/${customerId}/phones`, { method: 'POST', body: JSON.stringify(data) })
}
export async function createSimCard(customerId: string, data: { type: string; base_monthly_fee: number; phone_id?: string }): Promise<SimCardSummary> {
  return apiClient(`/customers/${customerId}/sim-cards`, { method: 'POST', body: JSON.stringify(data) })
}
```

### 3. Customer detail page

`src/app/(main)/customers/[id]/page.tsx` — Server Component:
```tsx
import { getCustomer } from '@/lib/data/customers'
import { CustomerDetailView } from '@/components/features/customers/CustomerDetailView'
import { notFound } from 'next/navigation'

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  try {
    const customer = await getCustomer(params.id)
    return <CustomerDetailView customer={customer} />
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) notFound()
    if ((err as { status?: number }).status === 403) {
      return <p className="text-status-error">You do not have access to this customer.</p>
    }
    throw err
  }
}
```

### 4. CustomerDetailView — `"use client"`

`src/components/features/customers/CustomerDetailView.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/stores/authStore'
import { CustomerPhonesTab } from './CustomerPhonesTab'
import { CustomerSimCardsTab } from './CustomerSimCardsTab'
import { CustomerCostBreakdownTab } from './CustomerCostBreakdownTab'
import type { CustomerDetail } from '@/types'

export function CustomerDetailView({ customer }: { customer: CustomerDetail }) {
  const isAdmin = useAuthStore(s => s.isAdmin())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{customer.name}</h1>
        <p className="text-sm text-text-secondary mt-1">{customer.contact_info}</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-sm">
        <span className="text-text-secondary">{customer.phone_count} phones</span>
        <span className="text-text-secondary">{customer.sim_card_count} SIM cards</span>
        <span className="text-text-secondary">{customer.open_request_count} open requests</span>
        <span className="text-text-secondary">€{customer.current_month_cost.toFixed(2)} this month</span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="phones">
        <TabsList>
          <TabsTrigger value="phones">Phones</TabsTrigger>
          <TabsTrigger value="sims">SIM Cards</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
          {isAdmin && <TabsTrigger value="time">Time Tracking</TabsTrigger>}
        </TabsList>

        <TabsContent value="phones">
          <CustomerPhonesTab customerId={customer.id} />
        </TabsContent>
        <TabsContent value="sims">
          <CustomerSimCardsTab customerId={customer.id} />
        </TabsContent>
        <TabsContent value="requests">
          <p className="text-text-secondary text-sm mt-4">Requests coming in plan-03.</p>
        </TabsContent>
        <TabsContent value="costs">
          <CustomerCostBreakdownTab customerId={customer.id} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="time">
            <p className="text-text-secondary text-sm mt-4">Time tracking coming in plan-03.</p>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
```

### 5. CustomerPhonesTab

`src/components/features/customers/CustomerPhonesTab.tsx` — `"use client"`:

```tsx
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

const STATUS_COLORS = {
  active: 'bg-status-success-bg text-status-success',
  in_repair: 'bg-status-warning-bg text-status-warning',
  replaced: 'bg-bg-tertiary text-text-secondary',
}

export function CustomerPhonesTab({ customerId }: { customerId: string }) {
  const isAdmin = useAuthStore(s => s.isAdmin())
  const [showCreate, setShowCreate] = useState(false)
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['phones', customerId],
    queryFn: () => getCustomerPhones(customerId),
  })

  if (isLoading) return <p className="text-text-secondary text-sm mt-4">Loading…</p>

  return (
    <div className="mt-4 space-y-3">
      {isAdmin && (
        <Button size="sm" onClick={() => setShowCreate(true)}>Add Phone</Button>
      )}

      {data?.phones.length === 0 && (
        <p className="text-text-secondary text-sm">No phones assigned.</p>
      )}

      <div className="space-y-2">
        {data?.phones.map(phone => (
          <div key={phone.id} className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">{phone.model}</p>
              <p className="text-xs text-text-secondary capitalize">{phone.ownership}</p>
            </div>
            <Badge className={STATUS_COLORS[phone.status]}>{phone.status.replace('_', ' ')}</Badge>
            {phone.is_unused && (
              <Badge className="bg-status-warning-bg text-status-warning">No SIM</Badge>
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
          onCreated={() => { setShowCreate(false); refetch() }}
        />
      )}
    </div>
  )
}

function CreatePhoneModal({ customerId, onClose, onCreated }: { customerId: string; onClose: () => void; onCreated: () => void }) {
  const [ownership, setOwnership] = useState('customer')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const data = new FormData(e.currentTarget)
    await createPhone(customerId, { model: data.get('model') as string, ownership })
    onCreated()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Phone</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" required disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label>Ownership</Label>
            <Select value={ownership} onValueChange={setOwnership}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### 6. CustomerSimCardsTab

Same pattern as CustomerPhonesTab. List SIM cards with `is_unused` badge ("No phone"), status badge, base_monthly_fee. Admin "Add SIM" button opens `CreateSimCardModal` (type selector: prepaid/postpaid, base_monthly_fee input, optional phone_id input).

### 7. CustomerCostBreakdownTab

`"use client"` component that calls `getCostBreakdown(customerId, month, year)`. Default month/year = current month. Renders:
- Month/year selector (prev/next month buttons)
- SIM fee line items table (SIM type, amount, "Actual" badge if `is_actual=true`)
- Request fees section (empty placeholder until plan-03)
- Total row

---

## Acceptance criteria

- [ ] `/customers/[id]` renders customer name, contact info, stat summary row
- [ ] Phones tab lists phones with status badge and "No SIM" badge when `is_unused=true`
- [ ] Admin sees "Add Phone" button; company does not
- [ ] SIM Cards tab lists SIM cards with is_unused badge
- [ ] Cost Breakdown tab shows SIM fee line items and total
- [ ] Requests tab shows placeholder text
- [ ] `pnpm build` exits 0, no type errors

## Automated checks

```bash
cd web
pnpm tsc --noEmit
pnpm build
```
