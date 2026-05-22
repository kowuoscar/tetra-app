import * as React from "react"
import styles from "./Toast.module.css"

export type ToastVariant = "success" | "warning" | "error" | "info"

export interface ToastProps {
  variant: ToastVariant
  title: string
  description?: string
  onClose?: () => void
}

const icons: Record<ToastVariant, string> = {
  success: "✓",
  warning: "!",
  error: "✕",
  info: "i",
}

export function Toast({ variant, title, description, onClose }: ToastProps) {
  return (
    <div className={[styles.toast, styles[variant]].join(" ")} role="alert">
      <div className={[styles.icon, styles[`icon-${variant}`]].join(" ")} aria-hidden="true">
        {icons[variant]}
      </div>
      <div className={styles.content}>
        <div className={[styles.toastTitle, styles[`title-${variant}`]].join(" ")}>{title}</div>
        {description && <div className={styles.desc}>{description}</div>}
      </div>
      {onClose && (
        <button className={styles.closeBtn} onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  )
}
