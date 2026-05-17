import { Suspense } from 'react'
import { CustomerListView } from '@/components/features/customers/CustomerListView'

export default function CustomersPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Customers</h1>
      <Suspense fallback={<CustomerListSkeleton />}>
        <CustomerListView />
      </Suspense>
    </div>
  )
}

function CustomerListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 bg-bg-tertiary rounded-lg animate-pulse" />
      ))}
    </div>
  )
}
