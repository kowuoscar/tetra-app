'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import type { UserSummary, UserRole } from '@/types'

type NavItem = { label: string; href: string; roles: UserRole[] }

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',      href: '/overview',     roles: ['admin', 'company'] },
  { label: 'Customers',     href: '/customers',    roles: ['admin', 'company'] },
  { label: 'Requests',      href: '/requests',     roles: ['admin', 'company', 'customer'] },
  { label: 'New Request',   href: '/requests/new', roles: ['company', 'customer'] },
  { label: 'My Phones',     href: '/phones',       roles: ['customer'] },
  { label: 'My SIM Cards',  href: '/sim-cards',    roles: ['customer'] },
  { label: 'Monthly Costs', href: '/costs',        roles: ['customer'] },
  { label: 'Billing',       href: '/invoices',     roles: ['admin', 'company'] },
  { label: 'Settings',      href: '/settings',     roles: ['admin'] },
  { label: 'Users',         href: '/users',        roles: ['admin'] },
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
      // best-effort — server clears cookies regardless
    }
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-bg-secondary">
      <aside className="w-64 flex-shrink-0 bg-surface border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-lg font-semibold text-text-primary">Tetra</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex-shrink-0 bg-surface border-b border-border flex items-center justify-end px-6 gap-4">
          <span className="text-sm text-text-secondary">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
