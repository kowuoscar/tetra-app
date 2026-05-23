'use client'

import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
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
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className={`h-4 bg-bg-secondary rounded animate-pulse ${j === 0 ? 'w-32' : j === 1 ? 'w-28' : 'w-16'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function EmptyState({ search, onAdd }: { search: string; onAdd?: () => void }) {
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
      <p className="text-xs text-text-secondary max-w-[280px] mb-4">
        {search
          ? `No results for "${search}". Try a different search.`
          : 'Create your first customer record to begin managing their phones, SIM cards, and requests.'}
      </p>
      {!search && onAdd && (
        <Button size="sm" onClick={onAdd}>Add customer</Button>
      )}
    </div>
  )
}

export function CustomerListView() {
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  const debouncedSearch = useDebounce(search, 300)
  const isAdmin = useAuthStore(s => s.isAdmin())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', debouncedSearch, page],
    queryFn: () => getCustomers({ page, size: 20, search: debouncedSearch }),
    placeholderData: keepPreviousData,
  })

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(0)
  }

  const openCreate = () => setShowCreate(true)

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Customers</h1>
          {data != null && (
            <p className="text-sm text-text-secondary mt-0.5">{data.total_elements} total</p>
          )}
        </div>
        {isAdmin && (
          <Button className="hidden lg:inline-flex" onClick={openCreate}>
            + New customer
          </Button>
        )}
      </div>

      {/* Search + Filter row */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={handleSearchChange}
          className="flex-1 bg-surface"
        />
        <Button variant="secondary" className="hidden sm:inline-flex">Filter</Button>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Phones</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider">SIM Cards</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Open Req.</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Current Month</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <TableSkeleton />}
            {!isLoading && data?.content.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState search={search} onAdd={isAdmin ? openCreate : undefined} />
                </td>
              </tr>
            )}
            {data?.content.map((c: CustomerSummary) => (
              <tr key={c.id} className="hover:bg-bg-secondary transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="text-brand-primary hover:underline font-medium uppercase">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary text-xs">{c.contact_info || '—'}</td>
                <td className="px-4 py-3 text-text-secondary">{c.phone_count}</td>
                <td className="px-4 py-3 text-text-secondary">{c.sim_card_count}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.open_request_count > 0
                      ? 'bg-status-warning/10 text-status-warning'
                      : 'bg-bg-tertiary text-text-secondary'
                  }`}>
                    {c.open_request_count}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-text-secondary">
                  €{c.current_month_cost.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden flex flex-col gap-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse">
            <div className="flex justify-between items-start mb-2">
              <div className="h-4 bg-bg-secondary rounded w-2/5" />
              <div className="h-5 bg-bg-secondary rounded-full w-14" />
            </div>
            <div className="h-3 bg-bg-secondary rounded w-3/5 mb-2" />
            <div className="h-3 bg-bg-secondary rounded w-1/2" />
          </div>
        ))}
        {!isLoading && data?.content.length === 0 && (
          <EmptyState search={search} onAdd={isAdmin ? openCreate : undefined} />
        )}
        {data?.content.map((c: CustomerSummary) => (
          <Link key={c.id} href={`/customers/${c.id}`}>
            <div className="bg-surface border border-border rounded-xl p-4 hover:border-brand-primary transition-colors">
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-sm font-semibold text-brand-primary uppercase">{c.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${
                  c.open_request_count > 0
                    ? 'bg-status-warning/10 text-status-warning'
                    : 'bg-status-success/10 text-status-success'
                }`}>
                  {c.open_request_count} open
                </span>
              </div>
              {c.contact_info && (
                <p className="text-xs text-text-secondary mb-2.5">{c.contact_info}</p>
              )}
              <div className="flex gap-3 text-xs text-text-secondary">
                <span>{c.phone_count} phones</span>
                <span>{c.sim_card_count} SIMs</span>
                <span>€{c.current_month_cost.toFixed(2)}/mo</span>
              </div>
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
          onCreated={() => { setShowCreate(false); refetch() }}
        />
      )}
    </div>
  )
}
