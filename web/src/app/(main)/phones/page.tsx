import { getMe } from '@/lib/data/auth'
import { requireRole } from '@/lib/utils/guards'
import { PhonesView } from '@/components/features/phones/PhonesView'

export default async function PhonesPage() {
  const user = await getMe()
  requireRole(user!, 'customer')
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">My Phones</h1>
      <PhonesView customerId={user!.customer_id!} />
    </div>
  )
}
