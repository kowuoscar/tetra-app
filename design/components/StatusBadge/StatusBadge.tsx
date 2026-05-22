import * as React from "react"
import styles from "./StatusBadge.module.css"

export type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "brand"

export interface StatusBadgeProps {
  variant?: BadgeVariant
  dot?: boolean
  children: React.ReactNode
  className?: string
}

export function StatusBadge({
  variant = "neutral",
  dot = true,
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={[styles.badge, styles[variant], className].filter(Boolean).join(" ")}
    >
      {dot && variant !== "brand" && (
        <span className={[styles.dot, styles[`dot-${variant}`]].join(" ")} aria-hidden="true" />
      )}
      {children}
    </span>
  )
}

export function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    submitted:   "info",
    in_progress: "warning",
    done:        "success",
    active:      "success",
    in_repair:   "warning",
    replaced:    "neutral",
    unassigned:  "warning",
    cancelled:   "neutral",
    draft:       "neutral",
    sent:        "info",
    paid:        "success",
  }
  return map[status] ?? "neutral"
}
