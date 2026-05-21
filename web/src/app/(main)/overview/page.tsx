import { getDashboardStats } from '@/lib/data/dashboard'

export default async function OverviewPage() {
  const stats = await getDashboardStats()

  const cards = [
    { label: 'Customers', value: stats.total_customers },
    { label: 'Phones', value: stats.total_phones },
    { label: 'SIM Cards', value: stats.total_sim_cards },
    { label: 'Open Requests', value: stats.open_requests },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div
            key={card.label}
            className="bg-surface rounded-xl border border-border p-5 shadow-sm"
          >
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              {card.label}
            </p>
            <p className="text-3xl font-semibold text-text-primary mt-2">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
