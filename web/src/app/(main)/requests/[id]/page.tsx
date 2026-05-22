import { RequestDetailView } from '@/components/features/requests/RequestDetailView'

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RequestDetailView requestId={id} />
}
