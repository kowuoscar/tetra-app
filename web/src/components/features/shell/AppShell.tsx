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
  { label: 'History',       href: '/history',      roles: ['admin'] },
  { label: 'My Phones',     href: '/phones',       roles: ['customer'] },
  { label: 'My SIM Cards',  href: '/sim-cards',    roles: ['customer'] },
  { label: 'Monthly Costs', href: '/costs',        roles: ['customer'] },
  { label: 'Billing',       href: '/invoices',     roles: ['admin', 'company'] },
  { label: 'Settings',      href: '/settings',     roles: ['admin'] },
  { label: 'Users',         href: '/users',        roles: ['admin'] },
]

const BOTTOM_NAV_STAFF: NavItem[] = [
  { label: 'Overview',  href: '/overview',  roles: ['admin', 'company'] },
  { label: 'Customers', href: '/customers', roles: ['admin', 'company'] },
  { label: 'Requests',  href: '/requests',  roles: ['admin', 'company'] },
  { label: 'Billing',   href: '/invoices',  roles: ['admin', 'company'] },
]

const BOTTOM_NAV_CUSTOMER: NavItem[] = [
  { label: 'Phones',    href: '/phones',    roles: ['customer'] },
  { label: 'SIM Cards', href: '/sim-cards', roles: ['customer'] },
  { label: 'Requests',  href: '/requests',  roles: ['customer'] },
  { label: 'Costs',     href: '/costs',     roles: ['customer'] },
]

function BottomNavIcon({ href }: { href: string }) {
  if (href === '/overview') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  )
  if (href === '/customers') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
  if (href === '/requests') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
  if (href === '/invoices') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
  if (href === '/phones') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  )
  if (href === '/sim-cards') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2" /><path d="M7 7h4v4H7z" />
    </svg>
  )
  if (href === '/costs') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
  return null
}

type Crumb = { label: string; href?: string }

export function AppShell({
  user,
  breadcrumb,
  children,
}: {
  user: UserSummary
  breadcrumb?: Crumb[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role))
  const bottomNavItems = user.role === 'customer' ? BOTTOM_NAV_CUSTOMER : BOTTOM_NAV_STAFF
  const initials = user.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const roleLabel = user.role === 'admin' ? 'Admin' : user.role === 'company' ? 'Company' : 'Customer'

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
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-[220px] flex-shrink-0 bg-surface border-r border-border flex-col">
        {/* Brand mark */}
        <div className="h-[52px] flex items-center px-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold leading-none">T</span>
            </div>
            <span className="text-sm font-semibold text-text-primary tracking-tight">Tetra</span>
          </div>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
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
        {/* User + role badge */}
        <div className="px-4 py-3 border-t border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-brand-primary">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
            <p className="text-xs text-text-secondary">{roleLabel}</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top header */}
        <header className="h-[52px] flex-shrink-0 bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 gap-4">
          {/* Mobile brand / desktop breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-semibold text-text-primary md:hidden">Tetra</span>
            {breadcrumb && breadcrumb.length > 0 && (
              <nav className="hidden md:flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
                {breadcrumb.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-text-disabled">/</span>}
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-text-secondary hover:text-text-primary transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-text-primary font-medium">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Main content — pb for bottom nav on mobile */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50">
        <div className="flex">
          {bottomNavItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                  active ? 'text-brand-primary' : 'text-text-secondary',
                ].join(' ')}
              >
                <BottomNavIcon href={item.href} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
