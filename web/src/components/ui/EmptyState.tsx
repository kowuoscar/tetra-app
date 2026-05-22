import * as React from "react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center text-center py-16 px-8 bg-surface border border-border rounded-lg", className)}>
      {icon && (
        <div className="w-14 h-14 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-disabled mb-4" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-md font-semibold text-text-primary mb-2">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-[280px] mb-6 leading-relaxed">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
