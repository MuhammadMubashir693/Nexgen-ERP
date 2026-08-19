import { type ReactNode } from 'react'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'purple'
  | 'gray'
  | 'orange'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'text-[var(--success-text)] bg-[var(--success-bg)]',
  danger: 'text-[var(--danger-text)] bg-[var(--danger-bg)]',
  warning: 'text-[var(--warning-text)] bg-[var(--warning-bg)]',
  info: 'text-[var(--info-text)] bg-[var(--info-bg)]',
  purple: 'text-accent-foreground bg-accent',
  gray: 'text-muted-foreground bg-muted',
  orange: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-950/40',
}

export default function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    Approved: 'success',
    approved: 'success',
    Active: 'success',
    active: 'success',
    Pending: 'warning',
    pending: 'warning',
    Rejected: 'danger',
    rejected: 'danger',
    Inactive: 'gray',
    inactive: 'gray',
    Admin: 'purple',
    IT: 'info',
    None: 'gray',
    PM: 'info',
  }
  return map[status] ?? 'default'
}
