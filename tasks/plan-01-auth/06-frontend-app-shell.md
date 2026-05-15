# Frontend — AppShell (Sidebar + Topbar + Logout)

## Domain

frontend

## Plan

`plans/plan-01-auth.md`

## Depends on

- `tasks/plan-01-auth/05-frontend-auth-middleware.md` — `useAuthStore` must be wired; `(main)` layout structure must exist

## References

- `specs/frontend.md` — page routes and roles for each nav item
- `design/preview.html` — AppShell layout visual reference (sidebar + topbar sections)

## Context

Replace the placeholder sidebar and topbar in the `(main)` layout with a real `AppShell` component. The sidebar shows role-filtered navigation links. The topbar shows the current user's name and a logout button that calls `DELETE /auth/session` and redirects to `/login`. After this task, the authenticated shell is complete and subsequent plans only add page content.

---

### Inlined spec excerpts

**Navigation links by role:**

| Nav item | Route | Roles |
|----------|-------|-------|
| Overview | `/overview` | admin, company |
| Customers | `/customers` | admin, company |
| Requests | `/requests` | admin, company, customer |
| New Request | `/requests/new` | company, customer |
| My Phones | `/phones` | customer |
| My SIM Cards | `/sim-cards` | customer |
| Monthly Costs | `/costs` | customer |
| Billing | `/invoices` | admin, company |
| Settings | `/settings` | admin |
| Users | `/users` | admin |

**DELETE /auth/session**
```
Auth required: Yes (any role)
Response 204: clears access_token + refresh_token cookies
```

**AppShell layout structure (from design/preview.html):**
- Fixed left sidebar: 256px wide, `bg-surface border-r border-border`
- Logo/brand at top of sidebar
- Nav links with active state (current route highlighted with `bg-brand-secondary text-brand-primary`)
- Fixed topbar: full width, height 64px, `bg-surface border-b border-border`
- Topbar: user name on right + logout button
- Main content: fills remaining space, `overflow-y-auto p-6`

---

## Implementation

### 1. AppShell server wrapper

Update `src/app/(main)/layout.tsx` to use `AppShell`:

```tsx
import { AppShell } from '@/components/features/shell/AppShell'

// Inside the return:
return (
  <AuthHydrator user={user}>
    <AppShell user={user}>
      {children}
    </AppShell>
  </AuthHydrator>
)
```

### 2. AppShell component

Create `src/components/features/shell/AppShell.tsx` — `"use client"`:

```tsx
'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import type { UserSummary, UserRole } from '@/types'

type NavItem = { label: string; href: string; roles: UserRole[] }

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',      href: '/overview',       roles: ['admin', 'company'] },
  { label: 'Customers',     href: '/customers',      roles: ['admin', 'company'] },
  { label: 'Requests',      href: '/requests',       roles: ['admin', 'company', 'customer'] },
  { label: 'New Request',   href: '/requests/new',   roles: ['company', 'customer'] },
  { label: 'My Phones',     href: '/phones',         roles: ['customer'] },
  { label: 'My SIM Cards',  href: '/sim-cards',      roles: ['customer'] },
  { label: 'Monthly Costs', href: '/costs',          roles: ['customer'] },
  { label: 'Billing',       href: '/invoices',       roles: ['admin', 'company'] },
  { label: 'Settings',      href: '/settings',       roles: ['admin'] },
  { label: 'Users',         href: '/users',          roles: ['admin'] },
]

export function AppShell({
  user,
  children,
}: {
  user: UserSummary
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  async function handleLogout() {
    try {
      await apiClient('/auth/session', { method: 'DELETE' })
    } catch {
      // best-effort — clear happens server-side regardless
    }
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-bg-secondary">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface border-r border-border flex flex-col">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-lg font-semibold text-text-primary">Tetra</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-fast',
                  active
                    ? 'bg-brand-secondary text-brand-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
                ].join(' ')}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 bg-surface border-b border-border flex items-center justify-end px-6 gap-4">
          <span className="text-sm text-text-secondary">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-fast"
          >
            Sign out
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 3. Add placeholder routes

For every route in `NAV_ITEMS` that doesn't have a `page.tsx` yet, create a placeholder page under `src/app/(main)/`:

```
src/app/(main)/
  overview/page.tsx       ← already exists from plan-00
  customers/page.tsx      ← placeholder
  requests/page.tsx       ← placeholder
  requests/new/page.tsx   ← placeholder
  phones/page.tsx         ← placeholder
  sim-cards/page.tsx      ← placeholder
  costs/page.tsx          ← placeholder
  invoices/page.tsx       ← placeholder
  settings/page.tsx       ← placeholder
  users/page.tsx          ← placeholder
```

Each placeholder page is a Server Component with a single line:
```tsx
export default function XxxPage() {
  return <p className="text-text-secondary">Coming soon.</p>
}
```

### 4. Role-based page guard helper

Create `src/lib/utils/guards.ts`:
```typescript
import { redirect } from 'next/navigation'
import type { UserSummary, UserRole } from '@/types'

export function requireRole(user: UserSummary, ...roles: UserRole[]) {
  if (!roles.includes(user.role)) redirect('/overview')
}
```

Usage in page.tsx files that are role-restricted:
```tsx
// e.g. settings/page.tsx
export default async function SettingsPage() {
  const user = await getMe()  // re-use the helper from (main)/layout.tsx — extract to lib/data/auth.ts
  requireRole(user!, 'admin')
  // ...
}
```

Extract `getMe()` to `src/lib/data/auth.ts` so both `(main)/layout.tsx` and individual page.tsx files can import it.

### 5. Manual test

- Log in as admin → confirm sidebar shows: Overview, Customers, Requests, New Request, Billing, Settings, Users
- Log in as customer → confirm sidebar shows: Requests, New Request, My Phones, My SIM Cards, Monthly Costs
- Active route link is highlighted in brand-secondary background
- Click "Sign out" → cookies cleared, redirected to `/login`

---

## Acceptance criteria

- [ ] Sidebar renders correct nav links for admin role (7 items listed above)
- [ ] Sidebar renders correct nav links for customer role (5 items: Requests, New Request, My Phones, My SIM Cards, Monthly Costs)
- [ ] Active route link has `bg-brand-secondary text-brand-primary` styling
- [ ] Topbar shows current user's name and "Sign out" button
- [ ] Clicking "Sign out" calls `DELETE /auth/session` and redirects to `/login`
- [ ] All placeholder pages exist and render without errors
- [ ] `pnpm build` exits 0
- [ ] `pnpm tsc --noEmit` exits 0

## Automated checks

```bash
cd web
pnpm tsc --noEmit
# Expect: exit 0

pnpm build
# Expect: exit 0, no type errors

# After pnpm dev, verify all routes resolve:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/overview
# Expect: 302 (redirect to /login — not authenticated)
```
