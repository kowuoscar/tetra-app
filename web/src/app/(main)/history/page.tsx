import { getMe } from '@/lib/data/auth'
import { requireRole } from '@/lib/utils/guards'
import { HistoryView } from '@/components/features/requests/HistoryView'

export default async function HistoryPage() {
  const user = await getMe()
  requireRole(user!, 'admin')
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Request History</h1>
      <HistoryView />
    </div>
  )
}
