'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useDebounce } from '@/hooks/useDebounce'
import { getCustomers } from '@/lib/data/customers'
import { useAuthStore } from '@/lib/stores/authStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CreateCustomerModal } from './CreateCustomerModal'
import type { CustomerSummary } from '@/types'

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className={`h-4 bg-bg-secondary rounded animate-pulse ${j === 0 ? 'w-32' : j === 1 ? 'w-28' : j === 6 ? 'w-12' : 'w-16'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <svg
        width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5"
        className="text-text-disabled mb-3"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <p className="text-sm font-semibold text-text-primary mb-1.5">
        {search ? 'No customers match' : 'No customers yet'}
      </p>
      <p className="text-xs text-text-secondary max-w-[280px]">
        {search
          ? `No results for "${search}". Try a different search.`
          : 'Add a customer to get started.'}
      </p>
    </div>
  )
}

export function CustomerListView() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  const debouncedSearch = useDebounce(search, 300)
  const isAdmin = useAuthStore(s => s.isAdmin())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', debouncedSearch, page],
    queryFn: () => getCustomers({ page, size: 20, search: debouncedSearch }),
  })

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(0)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Search customers…"
          value={search}
          onChange={handleSearchChange}
          className="max-w-xs"
        />
        <div className="flex-1" />
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)}>New Customer</Button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Customer</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Contact</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Phones</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">SIM Cards</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">Open Req.</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">This Month</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <TableSkeleton />}
            {!isLoading && data?.content.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState search={search} />
                </td>
              </tr>
            )}
            {data?.content.map((c: CustomerSummary) => (
              <tr key={c.id} className="hover:bg-bg-secondary transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/customers/${c.id}`}
                    className="text-brand-primary hover:underline font-medium"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary text-xs">{c.contact_info || '—'}</td>
                <td className="px-4 py-3 text-text-secondary">{c.phone_count}</td>
                <td className="px-4 py-3 text-text-secondary">{c.sim_card_count}</td>
                <td className="px-4 py-3">
                  {c.open_request_count > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-warning/10 text-status-warning">
                      {c.open_request_count}
                    </span>
                  ) : (
                    <span className="text-text-disabled text-xs">0</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-text-secondary">
                  €{c.current_month_cost.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/customers/${c.id}`}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border text-text-secondary hover:border-brand-primary hover:text-brand-primary transition-colors"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2.5 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="h-4 bg-bg-secondary rounded w-2/5" />
              <div className="h-5 bg-bg-secondary rounded-full w-14" />
            </div>
            <div className="h-3 bg-bg-secondary rounded w-3/5" />
            <div className="h-3 bg-bg-secondary rounded w-1/2" />
          </div>
        ))}
        {!isLoading && data?.content.length === 0 && <EmptyState search={search} />}
        {data?.content.map((c: CustomerSummary) => (
          <Link key={c.id} href={`/customers/${c.id}`}>
            <div className="bg-surface border border-border rounded-xl p-4 hover:border-brand-primary transition-colors">
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-sm font-semibold text-brand-primary">{c.name}</span>
                {c.open_request_count > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-status-warning/10 text-status-warning shrink-0 ml-2">
                    {c.open_request_count} open
                  </span>
                )}
              </div>
              {c.contact_info && (
                <p className="text-xs text-text-secondary mb-1.5">{c.contact_info}</p>
              )}
              <p className="text-xs text-text-disabled">
                {c.phone_count} phones · {c.sim_card_count} SIMs · €{c.current_month_cost.toFixed(2)}/mo
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-secondary hover:border-brand-primary hover:text-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">Page {page + 1} of {data.total_pages}</span>
          <button
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-secondary hover:border-brand-primary hover:text-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page >= data.total_pages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {showCreate && (
        <CreateCustomerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}
