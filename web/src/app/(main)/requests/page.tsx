import { RequestListView } from '@/components/features/requests/RequestListView'
import { NewRequestButton } from '@/components/features/requests/NewRequestButton'

export default function RequestsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Requests</h1>
        <NewRequestButton />
      </div>
      <RequestListView />
    </div>
  )
}
