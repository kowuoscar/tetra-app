import { RequestListView } from '@/components/features/requests/RequestListView'
import Link from 'next/link'

export default function RequestsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Requests</h1>
        <Link
          href="/requests/new"
          className="inline-flex items-center px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          New Request
        </Link>
      </div>
      <RequestListView />
    </div>
  )
}
