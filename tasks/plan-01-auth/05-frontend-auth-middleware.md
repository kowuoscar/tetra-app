# Frontend — Auth Middleware and Auth Store

## Domain

frontend

## Plan

`plans/plan-01-auth.md`

## Depends on

- `tasks/plan-01-auth/02-backend-auth-endpoints.md` — `GET /auth/me` endpoint must exist
- `tasks/plan-01-auth/04-frontend-login-page.md` — `UserSummary` type must exist

## References

- `specs/frontend.md` — route structure, role-based page access
- `docs/architecture.md#auth-strategy` — RBAC roles and scoping rules

## Context

Wire Next.js route middleware to protect all `(main)` routes and redirect unauthenticated users to `/login`. Add a Zustand auth store that holds the current user's identity (populated by calling `GET /auth/me` in the `(main)` layout). After this task, every page inside `(main)` can read the current user's role from the store to control rendering.

---

### Inlined spec excerpts

**Route access rules:**
```
(auth)/login      — public; redirect to /overview if already authenticated
(main)/overview   — admin, company only (customer → redirect to /phones)
(main)/customers  — admin, company only
(main)/requests   — all roles (customer auto-scoped server-side)
(main)/requests/new — company, customer only
(main)/phones     — customer only
(main)/sim-cards  — customer only
(main)/costs      — customer only
(main)/invoices   — admin, company only
(main)/settings   — admin only
(main)/users      — admin only
```

**GET /auth/me**
```
Auth required: Yes (any role)
Response 200: { "user": UserSummary }
Errors: 401 unauthenticated
```

**Zustand auth store shape:**
```typescript
type AuthStore = {
  user: UserSummary | null
  setUser: (user: UserSummary | null) => void
  isAdmin: () => boolean
  isCompany: () => boolean
  isCustomer: () => boolean
}
```

---

## Implementation

### 1. Next.js middleware

Create `src/middleware.ts` at the `web/src/` root:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']
const ADMIN_ONLY_PATHS = ['/settings', '/users']
const ADMIN_COMPANY_PATHS = ['/overview', '/customers', '/invoices']
const CUSTOMER_ONLY_PATHS = ['/phones', '/sim-cards', '/costs']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('access_token')?.value

  // Public paths — redirect authenticated users away from /login
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    if (accessToken) {
      return NextResponse.redirect(new URL('/overview', request.url))
    }
    return NextResponse.next()
  }

  // All (main) routes require authentication
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Note: role-based path restrictions are enforced in page/layout components
  // via the auth store (middleware cannot decode httpOnly JWT — it can only
  // check presence of the cookie). Fine-grained role enforcement happens
  // server-side via GET /auth/me in the (main) layout.
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
```

### 2. Zustand auth store

Create `src/lib/stores/authStore.ts`:

```typescript
import { create } from 'zustand'
import type { UserSummary } from '@/types'

type AuthStore = {
  user: UserSummary | null
  setUser: (user: UserSummary | null) => void
  isAdmin: () => boolean
  isCompany: () => boolean
  isCustomer: () => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  isAdmin: () => get().user?.role === 'admin',
  isCompany: () => get().user?.role === 'company',
  isCustomer: () => get().user?.role === 'customer',
}))
```

### 3. Auth initialiser in (main) layout

The `(main)` layout fetches the current user server-side on every navigation and passes it to a client-side hydration component.

Update `src/app/(main)/layout.tsx`:

```tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthHydrator } from '@/components/providers/AuthHydrator'
import type { UserSummary } from '@/types'

async function getMe(): Promise<UserSummary | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')
  if (!token) return null
  try {
    const res = await fetch(
      `${process.env.API_URL ?? 'http://localhost:8080'}/api/v1/auth/me`,
      {
        headers: { Cookie: `access_token=${token.value}` },
        cache: 'no-store',
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.user as UserSummary
  } catch {
    return null
  }
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getMe()
  if (!user) redirect('/login')

  return (
    <AuthHydrator user={user}>
      <div className="flex h-screen bg-bg-secondary">
        <aside className="w-64 bg-surface border-r border-border flex-shrink-0" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-surface border-b border-border flex-shrink-0" />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthHydrator>
  )
}
```

Note: `API_URL` is a server-only env var (no `NEXT_PUBLIC_` prefix) — add to `.env.local`:
```
API_URL=http://localhost:8080
```

Create `src/components/providers/AuthHydrator.tsx`:

```tsx
'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import type { UserSummary } from '@/types'

export function AuthHydrator({
  user,
  children,
}: {
  user: UserSummary
  children: React.ReactNode
}) {
  const setUser = useAuthStore(s => s.setUser)
  useEffect(() => { setUser(user) }, [user, setUser])
  return <>{children}</>
}
```

### 4. Add zustand to package.json

Zustand is already added in plan-00 scaffold. Confirm:
```bash
cd web && pnpm list zustand
# Expect: zustand version listed
```

### 5. Manual test

- Start API (with valid admin in DB) and web dev server.
- Navigate to `http://localhost:3000/overview` without logging in — confirm redirect to `/login`.
- Log in as admin — confirm redirect to `/overview`, page loads without errors.
- Open browser devtools → Application → Cookies — confirm `access_token` and `refresh_token` are httpOnly.

---

## Acceptance criteria

- [ ] Unauthenticated access to `/overview` redirects to `/login`
- [ ] Authenticated users visiting `/login` are redirected to `/overview`
- [ ] `useAuthStore().user` contains the current user's role after `AuthHydrator` runs
- [ ] `(main)` layout calls `GET /auth/me` server-side and redirects to `/login` if it returns 401
- [ ] `pnpm build` exits 0 with no type errors
- [ ] Middleware does not block `/api/` routes or Next.js static assets

## Automated checks

```bash
cd web
pnpm tsc --noEmit
# Expect: exit 0

pnpm build
# Expect: exit 0, no errors
```
