import * as React from "react"
import { cn } from "@/lib/utils"

export interface StatCardProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  subPositive?: boolean
  className?: string
}

export function StatCard({ label, value, sub, subPositive, className }: StatCardProps) {
  return (
    <div className={cn("bg-surface border border-border rounded-lg p-5", className)}>
      <div className="text-xs font-medium text-text-secondary uppercase tracking-[0.04em] mb-2">{label}</div>
      <div className="text-2xl font-bold text-text-primary leading-none mb-1">{value}</div>
      {sub && (
        <div className={cn("text-xs mt-1", subPositive ? "text-status-success" : "text-text-secondary")}>
          {sub}
        </div>
      )}
    </div>
  )
}
