'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCostBreakdown } from '@/lib/data/customers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function getDefaultPeriod() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

function prevMonth(month: number, year: number) {
  if (month === 1) return { month: 12, year: year - 1 }
  return { month: month - 1, year }
}

function nextMonth(month: number, year: number) {
  if (month === 12) return { month: 1, year: year + 1 }
  return { month: month + 1, year }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function CustomerCostBreakdownTab({ customerId }: { customerId: string }) {
  const defaultPeriod = getDefaultPeriod()
  const [month, setMonth] = useState(defaultPeriod.month)
  const [year, setYear] = useState(defaultPeriod.year)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cost-breakdown', customerId, month, year],
    queryFn: () => getCostBreakdown(customerId, month, year),
  })

  function handlePrev() {
    const p = prevMonth(month, year)
    setMonth(p.month)
    setYear(p.year)
  }

  function handleNext() {
    const p = nextMonth(month, year)
    setMonth(p.month)
    setYear(p.year)
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Month / year selector */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handlePrev} aria-label="Previous month">
          ‹
        </Button>
        <span className="text-sm font-medium text-text-primary min-w-[140px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <Button variant="outline" size="sm" onClick={handleNext} aria-label="Next month">
          ›
        </Button>
      </div>

      {isLoading && <p className="text-text-secondary text-sm">Loading…</p>}
      {isError && <p className="text-status-error text-sm">Failed to load cost breakdown.</p>}

      {data && (
        <div className="space-y-4">
          {/* SIM fee line items */}
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              SIM Fees
            </h3>
            {data.sim_fees.length === 0 ? (
              <p className="text-text-secondary text-sm">No SIM fees for this period.</p>
            ) : (
              <div className="space-y-1">
                {data.sim_fees.map((fee) => (
                  <div
                    key={fee.sim_card_id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary capitalize">
                        {fee.sim_card_type}
                      </span>
                      {fee.is_actual && (
                        <Badge className="bg-status-infoBg text-status-info text-xs">
                          Actual
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-medium text-text-primary font-mono">
                      €{fee.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Request fees — placeholder until plan-03 */}
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Request Fees
            </h3>
            {data.request_fees.length === 0 ? (
              <p className="text-text-secondary text-sm">No request fees for this period.</p>
            ) : (
              <div className="space-y-1">
                {data.request_fees.map((fee) => (
                  <div
                    key={fee.request_id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-text-secondary capitalize">
                      {fee.request_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-medium text-text-primary font-mono">
                      €{fee.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total row */}
          <div className="flex items-center justify-between pt-3 border-t border-border-strong">
            <span className="text-sm font-semibold text-text-primary">Total</span>
            <span className="text-sm font-bold text-text-primary font-mono">
              €{data.total.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
