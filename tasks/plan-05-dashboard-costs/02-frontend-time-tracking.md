# Frontend — Time Tracking Tab in Customer Detail

## Domain

frontend

## Plan

`plans/plan-05-dashboard-costs.md`

## Depends on

- `tasks/plan-05-dashboard-costs/01-backend-time-tracking.md` — GET /customers/{id}/time-report deployed

## References

- `specs/frontend.md#customer-detail` — Time Tracking tab (admin only)
- `tasks/plan-02-customers-assets/04-frontend-customer-detail.md` — CustomerDetailView with placeholder tab

## Context

Replace "Time tracking coming in plan-03" placeholder in `CustomerDetailView` with `CustomerTimeTrackingTab`. Admin only — tab hidden for non-admin. Shows per-type breakdown table + grand total row.

---

### Inlined spec excerpts

**Time Tracking tab:**
```
Visible: admin only
Data: GET /customers/{id}/time-report
Columns: Request Type | Count | Avg Time | Total Time
Footer row: Grand Total | — | — | {grand_total_minutes} min
```

---

## Implementation

### 1. Data function

Add to `src/lib/data/customers.ts`:
```typescript
export async function getCustomerTimeReport(id: string): Promise<{
  customer_id: string
  customer_name: string
  rows: Array<{
    request_type: string
    count: number
    avg_minutes: number
    total_minutes: number
  }>
  grand_total_minutes: number
}> {
  return apiClient(`/customers/${id}/time-report`)
}
```

### 2. CustomerTimeTrackingTab

`src/components/features/customers/CustomerTimeTrackingTab.tsx` — `"use client"`:

```tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { getCustomerTimeReport } from '@/lib/data/customers'

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const TYPE_LABELS: Record<string, string> = {
  phone_repair:      'Phone Repair',
  phone_replacement: 'Phone Replacement',
  sim_topup:         'SIM Top-Up',
  new_sim:           'New SIM',
  manual_support:    'Manual Support',
  onboarding:        'Onboarding',
}

export function CustomerTimeTrackingTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['time-report', customerId],
    queryFn: () => getCustomerTimeReport(customerId),
  })

  if (isLoading) {
    return <p className="text-text-secondary text-sm mt-4">Loading…</p>
  }

  if (!data?.rows.length) {
    return (
      <p className="text-text-secondary text-sm mt-4">
        No completed requests yet — time data will appear here once requests are marked done.
      </p>
    )
  }

  return (
    <div className="mt-4">
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary border-b border-border">
            <tr>
              {['Request Type', 'Count', 'Avg Time', 'Total Time'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-text-secondary font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.rows.map(row => (
              <tr key={row.request_type} className="hover:bg-bg-secondary transition-colors">
                <td className="px-4 py-3 text-text-primary">
                  {TYPE_LABELS[row.request_type] ?? row.request_type}
                </td>
                <td className="px-4 py-3 text-text-secondary">{row.count}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {formatMinutes(row.avg_minutes)}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {formatMinutes(row.total_minutes)}
                </td>
              </tr>
            ))}
            <tr className="bg-bg-secondary border-t-2 border-border">
              <td className="px-4 py-3 font-semibold text-text-primary">Grand Total</td>
              <td className="px-4 py-3 text-text-secondary">—</td>
              <td className="px-4 py-3 text-text-secondary">—</td>
              <td className="px-4 py-3 font-semibold text-text-primary">
                {formatMinutes(data.grand_total_minutes)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### 3. Wire into CustomerDetailView

`src/components/features/customers/CustomerDetailView.tsx`:

```tsx
// Add import:
import { CustomerTimeTrackingTab } from './CustomerTimeTrackingTab'

// Replace:
{isAdmin && (
  <TabsContent value="time">
    <p className="text-text-secondary text-sm mt-4">Time tracking coming in plan-03.</p>
  </TabsContent>
)}

// With:
{isAdmin && (
  <TabsContent value="time">
    <CustomerTimeTrackingTab customerId={customer.id} />
  </TabsContent>
)}
```

No other changes needed — tab trigger and conditional render already exist from plan-02 task 04.

---

## Acceptance criteria

- [ ] Time Tracking tab visible for admin, hidden for company and customer
- [ ] Tab shows per-type breakdown with count, avg time, total time
- [ ] `formatMinutes` shows `h m` format for times ≥ 60 min
- [ ] Grand Total row shows sum of all type totals
- [ ] No placeholder text remains in CustomerDetailView
- [ ] `pnpm build` exits 0, no type errors

## Automated checks

```bash
cd web
pnpm tsc --noEmit
pnpm build
```
