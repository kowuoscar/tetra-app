# Frontend Scaffold

## Domain

frontend

## Plan

`plans/plan-00-bootstrap.md`

## Depends on

None — can start immediately, parallel with `tasks/plan-00-bootstrap/00-backend-scaffold.md`.

## References

- `specs/frontend.md` — page routes, component list, state management choices
- `design/tokens.md` — full CSS custom properties and Tailwind config extension (paste verbatim)
- `design/brief.md` — visual language, layout principles

## Context

Scaffold the Next.js 15 (App Router) frontend project with TypeScript, pnpm, Tailwind CSS, shadcn/ui, TanStack Query v5, and Zustand. Wire in all design tokens. Create the route group structure and an empty authenticated shell layout. No pages or business logic — only the skeleton that every subsequent frontend task builds on. The project must build with `pnpm build` and serve without errors on `localhost:3000`.

---

### Inlined spec excerpts

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query v5 · Zustand

**Project location:** `web/` directory under project root (sibling to `api/`).

**Folder structure to create:**

```
web/
  src/
    app/
      (auth)/
        login/
          page.tsx          ← placeholder: "Login page coming in plan-01"
        layout.tsx          ← minimal layout (no shell — auth pages are full-page)
      (main)/
        layout.tsx          ← AppShell layout (sidebar + topbar — empty for now)
        overview/
          page.tsx          ← placeholder: "Overview coming in plan-02"
      layout.tsx            ← Root layout: html, body, providers
      page.tsx              ← Root redirect: redirect to /overview or /login
    components/
      ui/                   ← shadcn/ui primitives (populated by shadcn CLI)
      features/             ← empty — feature components added per plan
    lib/
      actions/              ← empty
      data/                 ← empty
      utils/
        index.ts            ← empty exports placeholder
      api/
        client.ts           ← fetch wrapper (base URL from env, credentials: include)
    hooks/
      index.ts              ← empty exports placeholder
    types/
      index.ts              ← empty exports placeholder
    styles/
      globals.css           ← design tokens CSS custom properties (paste from design/tokens.md)
  public/
    assets/
      fonts/
      images/
      svgs/
  tailwind.config.ts        ← paste from design/tokens.md
  next.config.ts
  tsconfig.json
  package.json
  .env.local                ← local dev env vars
  Dockerfile
```

**Naming conventions:**
- Components: PascalCase — `LoginForm.tsx`, `AppShell.tsx`
- Hooks: camelCase prefixed with `use` — `useAuth.ts`
- Server actions: camelCase suffixed with `Action` — `loginAction.ts`
- Data fetching: camelCase prefixed with `get` — `getUser.ts`
- Types: PascalCase suffixed with kind — `UserType`, `LoginRequest`, `ApiResponse`

**Design tokens — `src/styles/globals.css`:**

Paste the full CSS block from `design/tokens.md` verbatim. This file defines all `--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--z-*`, and `--duration-*` custom properties plus dark mode variants.

**Tailwind config — `tailwind.config.ts`:**

Paste the full TypeScript config from `design/tokens.md` verbatim. Maps all CSS custom properties to Tailwind utility classes (brand, bg, surface, border, text, status colors; font sizes; spacing; border radius; shadows; z-index; transition timing).

**Root layout — `src/app/layout.tsx`:**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css' // ← imports design tokens

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tetra Billing Dashboard',
  description: 'Internal operations dashboard for Tetra Mobile Solutions',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
```

`QueryProvider` is a client component in `src/components/providers/QueryProvider.tsx` that wraps with `QueryClientProvider` from `@tanstack/react-query`. Create it alongside the layout.

**Empty AppShell layout — `src/app/(main)/layout.tsx`:**

```tsx
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-bg-secondary">
      {/* Sidebar — wired in plan-01 auth */}
      <aside className="w-64 bg-surface border-r border-border flex-shrink-0" />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar — wired in plan-01 auth */}
        <header className="h-16 bg-surface border-b border-border flex-shrink-0" />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**API client — `src/lib/api/client.ts`:**

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export async function apiClient<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    credentials: 'include',  // send httpOnly cookies
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ code: 'unknown_error' }))
    throw Object.assign(new Error(error.message ?? 'Request failed'), {
      status: res.status,
      code: error.code,
    })
  }
  return res.json() as Promise<T>
}
```

**Environment variables — `.env.local`:**

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

**`next.config.ts`:**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',  // required for Docker container deployment
}

export default nextConfig
```

**`web/Dockerfile`:**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**shadcn/ui components to initialise:**

Run `pnpm dlx shadcn@latest init` and choose: TypeScript, Tailwind CSS, slate base color (we override with CSS vars), `src/` directory, App Router. Then add the base set of primitives used across the project:

```bash
pnpm dlx shadcn@latest add button input label card badge table dialog select tabs separator skeleton toast
```

---

## Implementation

1. Create `web/` directory under project root. Run:
   ```bash
   cd web
   pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint
   ```
   (Accept all defaults — Tailwind and App Router already selected.)

2. Install additional dependencies:
   ```bash
   pnpm add @tanstack/react-query@^5 zustand
   pnpm add -D @types/node
   ```

3. Replace `src/styles/globals.css` (or `src/app/globals.css` depending on scaffold output) with the full CSS from `design/tokens.md`. Ensure `@tailwind base`, `@tailwind components`, `@tailwind utilities` directives are at the top, then paste the `:root` block.

4. Replace `tailwind.config.ts` with the config from `design/tokens.md` (full TypeScript object as shown).

5. Create the folder structure shown above. Create all placeholder `page.tsx` files with a single paragraph of text (e.g. `<p>Overview coming in plan-02</p>`).

6. Create `src/components/providers/QueryProvider.tsx`:
   ```tsx
   'use client'
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
   import { useState } from 'react'
   export function QueryProvider({ children }: { children: React.ReactNode }) {
     const [client] = useState(() => new QueryClient({
       defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
     }))
     return <QueryClientProvider client={client}>{children}</QueryClientProvider>
   }
   ```

7. Update `src/app/layout.tsx` to import `QueryProvider` and wrap children.

8. Create `src/app/(main)/layout.tsx` with the empty AppShell structure shown above.

9. Create `src/app/(auth)/layout.tsx`:
   ```tsx
   export default function AuthLayout({ children }: { children: React.ReactNode }) {
     return (
       <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
         {children}
       </div>
     )
   }
   ```

10. Create `src/app/page.tsx`:
    ```tsx
    import { redirect } from 'next/navigation'
    export default function Home() {
      redirect('/overview')
    }
    ```

11. Create `src/lib/api/client.ts` as shown above.

12. Run `pnpm dlx shadcn@latest init` (choose: TypeScript, slate, src dir, App Router). Then:
    ```bash
    pnpm dlx shadcn@latest add button input label card badge table dialog select tabs separator skeleton toast
    ```

13. Create `next.config.ts` and `web/Dockerfile` as shown above.

14. Run `pnpm build` — confirm exits 0 with no type errors.

15. Run `pnpm dev` — confirm `localhost:3000` serves the app, redirects to `/overview`, renders the empty shell without console errors.

---

## Acceptance criteria

- [ ] `pnpm build` exits 0 with no TypeScript errors and no type-check failures
- [ ] `pnpm dev` serves `localhost:3000`; root `/` redirects to `/overview`; no console errors
- [ ] `src/styles/globals.css` contains all CSS custom properties from `design/tokens.md`
- [ ] `tailwind.config.ts` maps all token values as Tailwind utilities
- [ ] shadcn/ui base components (button, input, card, badge, table, dialog, select, tabs, separator, skeleton, toast) are installed under `src/components/ui/`
- [ ] `QueryProvider` wraps the root layout; TanStack Query v5 and Zustand are in `package.json`
- [ ] Route groups `(auth)` and `(main)` exist with their respective layouts
- [ ] `src/lib/api/client.ts` exists with `credentials: 'include'` on all requests

## Automated checks

```bash
cd web
pnpm build
# Expect: exit 0, no errors

pnpm tsc --noEmit
# Expect: exit 0, no type errors
```
