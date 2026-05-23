import { Suspense } from 'react'
import { CustomerListView } from '@/components/features/customers/CustomerListView'

export default function CustomersPage() {
  return (
    <Suspense fallback={<CustomerListSkeleton />}>
      <CustomerListView />
    </Suspense>
  )
}

function CustomerListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-7 w-32 bg-bg-secondary rounded animate-pulse" />
          <div className="h-4 w-16 bg-bg-secondary rounded animate-pulse" />
        </div>
        <div className="hidden lg:block h-9 w-36 bg-bg-secondary rounded-lg animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-bg-secondary rounded-lg animate-pulse" />
        <div className="h-9 w-20 bg-bg-secondary rounded-lg animate-pulse" />
      </div>
      {/* Desktop skeleton */}
      <div className="hidden sm:block border border-border rounded-xl overflow-hidden">
        <div className="h-10 bg-bg-secondary border-b border-border" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
            <div className="h-4 w-36 bg-bg-secondary rounded animate-pulse" />
            <div className="h-4 w-28 bg-bg-secondary rounded animate-pulse" />
            <div className="h-4 w-8 bg-bg-secondary rounded animate-pulse" />
            <div className="h-4 w-8 bg-bg-secondary rounded animate-pulse" />
            <div className="h-5 w-8 bg-bg-secondary rounded-full animate-pulse" />
            <div className="h-4 w-16 bg-bg-secondary rounded animate-pulse" />
            <div className="ml-auto h-7 w-12 bg-bg-secondary rounded animate-pulse" />
          </div>
        ))}
      </div>
      {/* Mobile skeleton */}
      <div className="sm:hidden space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse">
            <div className="flex justify-between items-start mb-2">
              <div className="h-4 w-2/5 bg-bg-secondary rounded" />
              <div className="h-5 w-14 bg-bg-secondary rounded-full" />
            </div>
            <div className="h-3 w-3/5 bg-bg-secondary rounded mb-2" />
            <div className="h-3 w-1/2 bg-bg-secondary rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
