# Frontend — Login Page

## Domain

frontend

## Plan

`plans/plan-01-auth.md`

## Depends on

- `tasks/plan-01-auth/02-backend-auth-endpoints.md` — `POST /auth/login` must be deployed and reachable

## References

- `specs/frontend.md#login` — route, states, components
- `docs/contracts.md#post-authlogin` — request/response shapes, error codes

## Context

Build the `/login` page with a `LoginForm` component. On successful login the frontend reads the `user.role` from the response body and redirects to `/overview` (admin/company) or `/phones` (customer). Error states are displayed inline. The page redirects away if the user already has an active session.

---

### Inlined spec excerpts

**Route:** `/login` — in `src/app/(auth)/login/page.tsx`
**Roles:** All (unauthenticated only)
**States:** idle | submitting | error

**Contract:**
```
POST /api/v1/auth/login
Auth required: No
Request: { "email": string, "password": string }
Response 200: { "user": UserSummary }
  Sets access_token + refresh_token cookies
Errors:
  401 invalid_credentials → show "Invalid email or password"
  403 account_deactivated → show "Your account has been deactivated"
```

**UserSummary shape (for role-based redirect):**
```typescript
type UserSummary = {
  id: string
  email: string
  name: string
  role: 'admin' | 'company' | 'customer'
  customer_id: string | null
  is_active: boolean
  created_at: string
}
```

**Component: `LoginForm`**
```
Props: none (self-contained — reads no external state)
States:
  idle     — form fields enabled, submit button text "Sign in"
  submitting — fields disabled, button shows spinner
  error    — fields enabled, error message banner below form
Token references:
  bg: bg-surface, shadow-md, radius-xl
  input: border-border, focus ring brand-primary
  button: bg-brand-primary hover:bg-brand-hover text-white
  error: bg-status-error-bg text-status-error border border-red-200
```

**Redirect logic:**
- On 200: if `user.role === 'customer'` → `router.replace('/phones')`, else → `router.replace('/overview')`
- Authenticated users landing on `/login` → redirect to `/overview` or `/phones` (checked in middleware, task 05)

---

## Implementation

1. Create `src/app/(auth)/login/page.tsx` as a Server Component. Check for the `access_token` cookie server-side; if present redirect to `/overview`. Otherwise render `LoginForm`.

   ```tsx
   import { cookies } from 'next/headers'
   import { redirect } from 'next/navigation'
   import { LoginForm } from '@/components/features/auth/LoginForm'

   export default async function LoginPage() {
     const cookieStore = await cookies()
     if (cookieStore.has('access_token')) redirect('/overview')
     return (
       <div className="w-full max-w-sm">
         <div className="text-center mb-8">
           <h1 className="text-2xl font-semibold text-text-primary">Tetra Dashboard</h1>
           <p className="text-sm text-text-secondary mt-1">Sign in to your account</p>
         </div>
         <LoginForm />
       </div>
     )
   }
   ```

2. Create `src/components/features/auth/LoginForm.tsx` — `"use client"` component:

   ```tsx
   'use client'
   import { useState } from 'react'
   import { useRouter } from 'next/navigation'
   import { Button } from '@/components/ui/button'
   import { Input } from '@/components/ui/input'
   import { Label } from '@/components/ui/label'
   import { apiClient } from '@/lib/api/client'
   import type { UserSummary } from '@/types'

   type LoginState = 'idle' | 'submitting' | 'error'
   type ErrorCode = 'invalid_credentials' | 'account_deactivated' | 'unknown'

   const ERROR_MESSAGES: Record<ErrorCode, string> = {
     invalid_credentials: 'Invalid email or password',
     account_deactivated: 'Your account has been deactivated',
     unknown: 'Something went wrong. Please try again.',
   }

   export function LoginForm() {
     const router = useRouter()
     const [state, setState] = useState<LoginState>('idle')
     const [errorCode, setErrorCode] = useState<ErrorCode>('unknown')

     async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
       e.preventDefault()
       setState('submitting')
       const data = new FormData(e.currentTarget)

       try {
         const res = await apiClient<{ user: UserSummary }>('/auth/login', {
           method: 'POST',
           body: JSON.stringify({
             email: data.get('email') as string,
             password: data.get('password') as string,
           }),
         })
         router.replace(res.user.role === 'customer' ? '/phones' : '/overview')
       } catch (err: unknown) {
         const code = (err as { code?: string }).code ?? 'unknown'
         setErrorCode((ERROR_MESSAGES[code as ErrorCode] ? code : 'unknown') as ErrorCode)
         setState('error')
       }
     }

     return (
       <form onSubmit={handleSubmit} className="bg-surface shadow-md rounded-xl p-8 space-y-5">
         {state === 'error' && (
           <div className="bg-status-error-bg text-status-error border border-red-200 rounded-md px-4 py-3 text-sm">
             {ERROR_MESSAGES[errorCode]}
           </div>
         )}

         <div className="space-y-1.5">
           <Label htmlFor="email">Email</Label>
           <Input
             id="email"
             name="email"
             type="email"
             autoComplete="email"
             required
             disabled={state === 'submitting'}
             placeholder="you@example.com"
           />
         </div>

         <div className="space-y-1.5">
           <Label htmlFor="password">Password</Label>
           <Input
             id="password"
             name="password"
             type="password"
             autoComplete="current-password"
             required
             disabled={state === 'submitting'}
           />
         </div>

         <Button
           type="submit"
           className="w-full"
           disabled={state === 'submitting'}
         >
           {state === 'submitting' ? 'Signing in…' : 'Sign in'}
         </Button>
       </form>
     )
   }
   ```

3. Add `UserSummary` type to `src/types/index.ts`:

   ```typescript
   export type UserRole = 'admin' | 'company' | 'customer'

   export type UserSummary = {
     id: string
     email: string
     name: string
     role: UserRole
     customer_id: string | null
     is_active: boolean
     created_at: string
   }
   ```

4. Verify `src/app/(auth)/layout.tsx` centres content on the screen (from plan-00 scaffold — should already be correct).

5. Run `pnpm dev`. Navigate to `http://localhost:3000/login`. Confirm:
   - Form renders with email + password fields
   - Submitting with bad credentials shows error banner
   - Submitting with `admin@tetramobile.ae` / `Admin1234!` redirects to `/overview`

---

## Acceptance criteria

- [ ] `/login` renders `LoginForm` — email input, password input, submit button
- [ ] Submitting valid admin credentials sets cookies and redirects to `/overview`
- [ ] Submitting invalid credentials shows "Invalid email or password" banner without page reload
- [ ] Form fields are disabled during submission
- [ ] `pnpm build` exits 0 with no type errors
- [ ] `pnpm tsc --noEmit` exits 0

## Automated checks

```bash
cd web
pnpm tsc --noEmit
# Expect: exit 0, no errors

pnpm build
# Expect: exit 0
```
