import * as React from "react"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  mono?: boolean
  secondary?: boolean
  width?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  onRowClick?: (row: T) => void
  empty?: React.ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  empty,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-hidden bg-surface border border-border rounded-lg", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-3 text-[11px] font-semibold text-text-secondary bg-bg-secondary border-b border-border uppercase tracking-[0.04em] whitespace-nowrap"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-text-secondary px-4 py-10">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "[&:not(:last-child)>td]:border-b [&:not(:last-child)>td]:border-border hover:[&>td]:bg-bg-tertiary",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-[10px] text-text-primary align-middle",
                      col.mono && "font-mono text-xs",
                      col.secondary && "text-text-secondary",
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
