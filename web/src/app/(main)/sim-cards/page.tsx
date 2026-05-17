import { getMe } from '@/lib/data/auth'
import { requireRole } from '@/lib/utils/guards'
import { SimCardsView } from '@/components/features/simcards/SimCardsView'

export default async function SimCardsPage() {
  const user = await getMe()
  requireRole(user!, 'customer')
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">My SIM Cards</h1>
      <SimCardsView customerId={user!.customer_id!} />
    </div>
  )
}
