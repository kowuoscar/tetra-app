import * as React from "react"
import styles from "./Button.module.css"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg"
  loading?: boolean
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-size={size}
      className={[styles.button, className].filter(Boolean).join(" ")}
      {...props}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        children
      )}
    </button>
  )
}
