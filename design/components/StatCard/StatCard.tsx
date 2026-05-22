import * as React from "react"
import styles from "./StatCard.module.css"

export interface StatCardProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  subPositive?: boolean
  className?: string
}

export function StatCard({ label, value, sub, subPositive, className }: StatCardProps) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(" ")}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {sub && (
        <div className={[styles.sub, subPositive ? styles.subUp : ""].filter(Boolean).join(" ")}>
          {sub}
        </div>
      )}
    </div>
  )
}
