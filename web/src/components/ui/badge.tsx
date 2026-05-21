import { cn } from '@/lib/utils'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand'

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-status-successBg text-status-success',
  warning: 'bg-status-warningBg text-status-warning',
  error:   'bg-status-errorBg   text-status-error',
  info:    'bg-status-infoBg    text-status-info',
  neutral: 'bg-bg-tertiary      text-text-secondary',
  brand:   'bg-brand-secondary  text-brand-primary',
}

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  error:   'bg-status-error',
  info:    'bg-status-info',
  neutral: 'bg-text-disabled',
  brand:   'bg-brand-primary',
}

export function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    submitted:   'info',
    in_progress: 'warning',
    done:        'success',
    active:      'success',
    in_repair:   'warning',
    replaced:    'neutral',
    unassigned:  'warning',
    cancelled:   'neutral',
    draft:       'neutral',
    sent:        'info',
    paid:        'success',
  }
  return map[status] ?? 'neutral'
}

interface StatusBadgeProps {
  variant?: BadgeVariant
  dot?: boolean
  children: React.ReactNode
  className?: string
}

export function StatusBadge({
  variant = 'neutral',
  dot = true,
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[5px] rounded-full px-2 py-[2px]',
        'text-xs font-medium leading-[1.5] whitespace-nowrap',
        variantClasses[variant],
        className
      )}
    >
      {dot && variant !== 'brand' && (
        <span className={cn('w-[6px] h-[6px] rounded-full flex-shrink-0', dotClasses[variant])} />
      )}
      {children}
    </span>
  )
}
