import Link from 'next/link'
import { getDashboardStats } from '@/lib/data/dashboard'
import { RecentRequests } from '@/components/features/overview/RecentRequests'

type StatCard = {
  desktopLabel: string
  mobileLabel: string
  value: number
  subText?: string
  subTextGreen?: boolean
  warn?: boolean
}

export default async function OverviewPage() {
  const stats = await getDashboardStats()

  const cards: StatCard[] = [
    {
      desktopLabel: 'Total Customers',
      mobileLabel:  'Customers',
      value:        stats.total_customers,
      subText:      stats.new_customers_this_month > 0 ? `+${stats.new_customers_this_month} this month` : undefined,
      subTextGreen: true,
    },
    {
      desktopLabel: 'Total Phones',
      mobileLabel:  'Phones',
      value:        stats.total_phones,
      subText:      stats.phones_in_repair > 0 ? `${stats.phones_in_repair} in repair` : undefined,
    },
    {
      desktopLabel: 'Total SIM Cards',
      mobileLabel:  'SIM Cards',
      value:        stats.total_sim_cards,
      subText:      stats.unassigned_sim_cards > 0 ? `${stats.unassigned_sim_cards} unassigned` : undefined,
    },
    {
      desktopLabel: 'Open Requests',
      mobileLabel:  'Open Req.',
      value:        stats.open_requests,
      subText:      stats.open_requests > 0
        ? `${stats.submitted_requests} submitted, ${stats.in_progress_requests} in progress`
        : undefined,
      warn: true,
    },
  ]

  const now = new Date()
  const subtitle = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Overview</h1>
          <p className="text-sm text-text-secondary mt-0.5">Tetra Mobile Solutions — {subtitle}</p>
        </div>
        <Link
          href="/requests/new"
          className="hidden lg:inline-flex shrink-0 items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New request
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map(card => (
          <div key={card.desktopLabel} className="bg-surface rounded-lg border border-border py-4.5 px-5">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
              <span className="lg:hidden">{card.mobileLabel}</span>
              <span className="hidden lg:inline">{card.desktopLabel}</span>
            </p>
            <p className={`text-3xl font-bold leading-none mt-2 ${card.warn && card.value > 0 ? 'text-status-warning' : 'text-text-primary'}`}>
              {card.value}
            </p>
            {card.subText && (
              <p className={`text-xs mt-1.5 ${card.subTextGreen ? 'text-status-success' : 'text-text-secondary'}`}>
                {card.subText}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Quick actions */}
      <div className="lg:hidden bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Quick actions</h2>
        </div>
        <div className="p-4 flex flex-col gap-2">
          <Link
            href="/requests/new"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg"
          >
            New request
          </Link>
          <Link
            href="/customers/new"
            className="w-full flex items-center justify-center px-4 py-2 bg-surface text-text-primary text-sm font-medium rounded-lg border border-border-strong"
          >
            New customer
          </Link>
        </div>
      </div>

      {/* Desktop: content grid */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-4">
        <RecentRequests openCount={stats.open_requests} />

        {/* Assets needing attention */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Assets needing attention</h2>
          </div>
          <div className="px-5 py-1">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-text-primary">Phones without SIM</p>
                <p className="text-xs text-text-secondary mt-0.5">Active phones with no SIM assigned</p>
              </div>
              {stats.phones_without_sim > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-status-warning/10 text-status-warning">
                  {stats.phones_without_sim}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Unassigned SIM cards</p>
                <p className="text-xs text-text-secondary mt-0.5">SIMs not assigned to any phone</p>
              </div>
              {stats.unassigned_sim_cards > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-status-warning/10 text-status-warning">
                  {stats.unassigned_sim_cards}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
