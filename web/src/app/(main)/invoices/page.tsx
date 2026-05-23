import { Suspense } from 'react'
import { InvoiceListView } from '@/components/features/invoices/InvoiceListView'

export default function InvoicesPage() {
  return (
    <Suspense fallback={<InvoiceListSkeleton />}>
      <InvoiceListView />
    </Suspense>
  )
}

function InvoiceListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-7 w-32 bg-bg-secondary rounded animate-pulse" />
          <div className="h-4 w-24 bg-bg-secondary rounded animate-pulse" />
        </div>
        <div className="h-8 w-36 bg-bg-secondary rounded-lg animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-28 bg-bg-secondary rounded-lg animate-pulse" />
      </div>
      <div className="hidden sm:block border border-border rounded-xl overflow-hidden">
        <div className="h-10 bg-bg-secondary border-b border-border" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
            <div className="h-4 w-20 bg-bg-secondary rounded animate-pulse" />
            <div className="h-4 w-24 bg-bg-secondary rounded animate-pulse" />
            <div className="h-5 w-16 bg-bg-secondary rounded-full animate-pulse" />
            <div className="h-4 w-20 bg-bg-secondary rounded animate-pulse" />
            <div className="h-4 w-24 bg-bg-secondary rounded animate-pulse" />
            <div className="ml-auto h-7 w-12 bg-bg-secondary rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
