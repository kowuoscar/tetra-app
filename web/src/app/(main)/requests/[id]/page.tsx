import { getMe } from '@/lib/data/auth'
import { RequestDetailView } from '@/components/features/requests/RequestDetailView'

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getMe()
  const { id } = await params
  return <RequestDetailView requestId={id} userRole={user?.role ?? 'customer'} />
}
