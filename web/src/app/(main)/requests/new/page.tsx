import { getMe } from '@/lib/data/auth'
import { NewRequestForm } from '@/components/features/requests/NewRequestForm'

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ phone_id?: string; sim_card_id?: string; customer_id?: string }>
}) {
  const user = await getMe()
  const params = await searchParams
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">New Request</h1>
      <NewRequestForm
        initialPhoneId={params.phone_id}
        initialSimCardId={params.sim_card_id}
        initialCustomerId={params.customer_id ?? (user?.customer_id ?? undefined) ?? undefined}
        userRole={user?.role ?? 'customer'}
      />
    </div>
  )
}
