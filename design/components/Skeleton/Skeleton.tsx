import * as React from "react"
import styles from "./Skeleton.module.css"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
}

export function Skeleton({ width, height, className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={[styles.skeleton, className].filter(Boolean).join(" ")}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  )
}

export function SkeletonText({ width, className }: { width?: string | number; className?: string }) {
  return (
    <div
      className={[styles.skeleton, styles.skeletonText, className].filter(Boolean).join(" ")}
      style={{ width }}
      aria-hidden="true"
    />
  )
}

export interface SkeletonCardProps {
  rows?: number
}

export function SkeletonCard({ rows = 3 }: SkeletonCardProps) {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <SkeletonText width="60%" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonText key={i} width={i % 2 === 0 ? "80%" : "50%"} />
      ))}
    </div>
  )
}

export function Spinner({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div
      className={[styles.spinner, size === "lg" ? styles.spinnerLg : ""].filter(Boolean).join(" ")}
      role="status"
      aria-label="Loading"
    />
  )
}
