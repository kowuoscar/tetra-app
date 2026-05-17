import { notFound } from 'next/navigation'
import { getCustomer } from '@/lib/data/customers'
import { CustomerDetailView } from '@/components/features/customers/CustomerDetailView'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  try {
    const customer = await getCustomer(id)
    return <CustomerDetailView customer={customer} />
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    if (status === 404) notFound()
    if (status === 403) {
      return (
        <p className="text-status-error text-sm mt-4">
          You do not have access to this customer.
        </p>
      )
    }
    throw err
  }
}
