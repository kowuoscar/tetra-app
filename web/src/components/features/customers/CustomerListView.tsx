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

  const columns = ['Name', 'Phones', 'SIM Cards', 'Open Requests', 'Month Cost']

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          placeholder="Search customers…"
          value={search}
          onChange={handleSearchChange}
          className="max-w-xs"
        />
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)}>New Customer</Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-text-secondary text-sm">Loading…</p>
      ) : data?.content.length === 0 ? (
        <p className="text-text-secondary text-sm">No customers found.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary border-b border-border">
              <tr>
                {columns.map(col => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {data?.content.map((c: CustomerSummary) => (
                <tr
                  key={c.id}
                  className="hover:bg-bg-tertiary transition-colors duration-normal"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-brand-primary hover:underline font-medium"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{c.phone_count}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.sim_card_count}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.open_request_count}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    AED {c.current_month_cost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total_pages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-text-secondary">
            Page {page + 1} of {data.total_pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= data.total_pages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
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
