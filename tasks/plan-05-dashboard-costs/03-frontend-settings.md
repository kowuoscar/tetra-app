# Frontend — Settings Page

## Domain

frontend

## Plan

`plans/plan-05-dashboard-costs.md`

## Depends on

- `tasks/plan-05-dashboard-costs/00-backend-system-settings.md` — GET/PUT /settings deployed

## References

- `specs/frontend.md#settings` — route, fields, admin-only guard

## Context

`/settings` page — admin only. Single form section: bank details used on generated invoice PDFs. Loads current values on mount, saves via `PUT /settings` (full replace — all fields required). Non-admin redirect to `/overview` via `requireRole`.

**Correct fields (verified against contracts.md):**
- `bank_account_holder` (e.g. "Oscar Doe")
- `bank_iban` (e.g. "AE070331234567890123456")
- `bank_swift` (e.g. "WIOBAEADXXX")
- `company_name` (e.g. "Tetra Mobile Solutions FZ-LLC")
- `company_address`

All are required — PUT is a full replace, backend enforces `@NotBlank` on all fields.

---

## Implementation

### 1. Data functions

Create `src/lib/data/settings.ts`:
```typescript
import { apiClient } from '@/lib/api/client'

export type SystemSettings = {
  bank_account_holder: string | null
  bank_iban: string | null
  bank_swift: string | null
  company_name: string | null
  company_address: string | null
}

export async function getSystemSettings(): Promise<SystemSettings> {
  return apiClient('/settings')
}

export async function replaceSystemSettings(data: {
  bank_account_holder: string
  bank_iban: string
  bank_swift: string
  company_name: string
  company_address: string
}): Promise<SystemSettings> {
  return apiClient('/settings', { method: 'PUT', body: JSON.stringify(data) })
}
```

### 2. Page

`src/app/(main)/settings/page.tsx` — Server Component:
```tsx
import { getMe } from '@/lib/data/auth'
import { requireRole } from '@/lib/utils/guards'
import { SettingsView } from '@/components/features/settings/SettingsView'

export default async function SettingsPage() {
  const user = await getMe()
  requireRole(user!, 'admin')
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Settings</h1>
      <SettingsView />
    </div>
  )
}
```

### 3. SettingsView — `"use client"`

`src/components/features/settings/SettingsView.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSystemSettings, replaceSystemSettings } from '@/lib/data/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function SettingsView() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const [bankAccountHolder, setBankAccountHolder] = useState('')
  const [bankIban, setBankIban] = useState('')
  const [bankSwift, setBankSwift] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: getSystemSettings,
  })

  useEffect(() => {
    if (data) {
      setBankAccountHolder(data.bank_account_holder ?? '')
      setBankIban(data.bank_iban ?? '')
      setBankSwift(data.bank_swift ?? '')
      setCompanyName(data.company_name ?? '')
      setCompanyAddress(data.company_address ?? '')
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: () => replaceSystemSettings({
      bank_account_holder: bankAccountHolder,
      bank_iban: bankIban,
      bank_swift: bankSwift,
      company_name: companyName,
      company_address: companyAddress,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const canSave = bankAccountHolder.trim() && bankIban.trim() && bankSwift.trim()
    && companyName.trim() && companyAddress.trim()

  if (isLoading) {
    return <div className="h-64 bg-bg-tertiary rounded-xl animate-pulse max-w-lg" />
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-medium text-text-primary">Bank & Invoice Details</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Printed on generated invoice PDFs. All fields required.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bankAccountHolder">Account Holder</Label>
          <Input
            id="bankAccountHolder"
            value={bankAccountHolder}
            onChange={e => setBankAccountHolder(e.target.value)}
            placeholder="Oscar Doe"
            disabled={mutation.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bankIban">IBAN</Label>
          <Input
            id="bankIban"
            value={bankIban}
            onChange={e => setBankIban(e.target.value)}
            placeholder="AE070331234567890123456"
            disabled={mutation.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bankSwift">SWIFT / BIC</Label>
          <Input
            id="bankSwift"
            value={bankSwift}
            onChange={e => setBankSwift(e.target.value)}
            placeholder="WIOBAEADXXX"
            disabled={mutation.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="Tetra Mobile Solutions FZ-LLC"
            disabled={mutation.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companyAddress">Company Address</Label>
          <Textarea
            id="companyAddress"
            value={companyAddress}
            onChange={e => setCompanyAddress(e.target.value)}
            rows={3}
            placeholder="Dubai, UAE"
            disabled={mutation.isPending}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canSave}
          >
            {mutation.isPending ? 'Saving…' : 'Save Settings'}
          </Button>
          {saved && (
            <span className="text-sm text-status-success">Settings saved</span>
          )}
          {mutation.isError && (
            <span className="text-sm text-status-error">Save failed</span>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 4. Add /settings to nav

`src/components/layout/AppShell.tsx` — add to `NAV_ITEMS`:
```tsx
{ href: '/settings', label: 'Settings', roles: ['admin'] }
```

---

## Acceptance criteria

- [ ] `/settings` loads current bank details from `GET /settings`
- [ ] All 5 fields shown: account holder, IBAN, SWIFT, company name, company address
- [ ] Save button disabled if any field is empty
- [ ] Saving calls `PUT /settings` (full replace); "Settings saved" confirmation shown 3 s
- [ ] Non-admin accessing `/settings` redirected to `/overview`
- [ ] Nav shows "Settings" link for admin only
- [ ] `pnpm build` exits 0, no type errors

## Automated checks

```bash
cd web
pnpm tsc --noEmit
pnpm build
```
