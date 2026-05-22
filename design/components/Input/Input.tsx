import * as React from "react"
import styles from "./Input.module.css"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  errorText?: string
  error?: boolean
}

export function Input({
  label,
  helperText,
  errorText,
  error,
  id,
  className,
  disabled,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined)
  const helperId = inputId ? `${inputId}-helper` : undefined
  const errorId = inputId ? `${inputId}-error` : undefined
  const describedBy = errorText ? errorId : helperText ? helperId : undefined
  const hasError = error || Boolean(errorText)

  return (
    <div className={styles.group}>
      {label && (
        <label
          htmlFor={inputId}
          className={[styles.label, disabled ? styles.labelDisabled : ""].filter(Boolean).join(" ")}
        >
          {label}
        </label>
      )}
      <div className={styles.wrap}>
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={[styles.input, hasError ? styles.error : "", className].filter(Boolean).join(" ")}
          {...props}
        />
      </div>
      {errorText && (
        <span id={errorId} className={styles.errorText}>
          {errorText}
        </span>
      )}
      {!errorText && helperText && (
        <span id={helperId} className={styles.helperText}>
          {helperText}
        </span>
      )}
    </div>
  )
}
