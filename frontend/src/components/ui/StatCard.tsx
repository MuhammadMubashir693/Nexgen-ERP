import { type ReactNode } from 'react'

type IconColor = 'red' | 'blue' | 'purple' | 'orange' | 'green'

interface StatCardProps {
  icon: ReactNode
  iconColor: IconColor
  value: string
  label: string
  trend?: string
  trendType?: 'up' | 'down' | 'neutral'
  className?: string
}

const iconBgMap: Record<IconColor, string> = {
  red: 'bg-[#fef2f2] text-[#ef4444]',
  blue: 'bg-[#eff6ff] text-[#3b82f6]',
  purple: 'bg-[#ede9fe] text-[#7c3aed]',
  orange: 'bg-[#fff7ed] text-[#f59e0b]',
  green: 'bg-[#ecfdf5] text-[#10b981]',
}

const iconBgDarkMap: Record<IconColor, string> = {
  red: 'dark:bg-[#450a0a] dark:text-[#f87171]',
  blue: 'dark:bg-[#0c1a2e] dark:text-[#60a5fa]',
  purple: 'dark:bg-[#2e1065] dark:text-[#a78bfa]',
  orange: 'dark:bg-[#431407] dark:text-[#fcd34d]',
  green: 'dark:bg-[#022c22] dark:text-[#34d399]',
}

export default function StatCard({
  icon,
  iconColor,
  value,
  label,
  trend,
  trendType = 'neutral',
  className = '',
}: StatCardProps) {
  return (
    <div
      className={`bg-card border border-border rounded-[var(--radius)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${className}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBgMap[iconColor]} ${iconBgDarkMap[iconColor]}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-foreground leading-tight tracking-tight">
            {value}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
      </div>
      {trend && (
        <div
          className={`text-xs font-medium flex items-center gap-1 ${
            trendType === 'up'
              ? 'text-success'
              : trendType === 'down'
                ? 'text-danger'
                : 'text-muted-foreground'
          }`}
        >
          {trendType === 'up' && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 2.5l4 4H2l4-4z"
                fill="currentColor"
              />
            </svg>
          )}
          {trendType === 'down' && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 9.5L2 5.5h8L6 9.5z"
                fill="currentColor"
              />
            </svg>
          )}
          {trendType === 'neutral' && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6h8M8 4l2 2-2 2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {trend}
        </div>
      )}
    </div>
  )
}
