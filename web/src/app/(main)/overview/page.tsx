import Link from 'next/link'
import { getDashboardStats } from '@/lib/data/dashboard'
import { RecentRequests } from '@/components/features/overview/RecentRequests'

export default async function OverviewPage() {
  const stats = await getDashboardStats()

  const cards = [
    { label: 'Customers',     value: stats.total_customers },
    { label: 'Phones',        value: stats.total_phones },
    { label: 'SIM Cards',     value: stats.total_sim_cards },
    { label: 'Open Requests', value: stats.open_requests },
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
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New request
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div
            key={card.label}
            className="bg-surface rounded-xl border border-border p-5"
          >
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              {card.label}
            </p>
            <p className="text-3xl font-semibold text-text-primary mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent requests */}
      <div className="max-w-2xl">
        <RecentRequests />
      </div>
    </div>
  )
}
