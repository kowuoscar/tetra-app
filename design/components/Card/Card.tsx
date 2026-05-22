import * as React from "react"
import styles from "./Card.module.css"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  shadow?: "none" | "sm" | "md"
}

export function Card({ shadow = "none", className, children, ...props }: CardProps) {
  return (
    <div
      data-shadow={shadow}
      className={[styles.card, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={[styles.cardHeader, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  )
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={[styles.cardBody, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={[styles.cardFooter, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  )
}

export function MetaRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaKey}>{label}</span>
      <span className={[styles.metaVal, mono ? styles.mono : ""].filter(Boolean).join(" ")}>
        {value}
      </span>
    </div>
  )
}
