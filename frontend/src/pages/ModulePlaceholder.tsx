import { type ReactNode } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

interface QuickStat {
  label: string
  value: string
  trend?: string
  trendType?: 'up' | 'down' | 'neutral'
  color: 'red' | 'blue' | 'purple' | 'orange' | 'green'
}

interface ModulePlaceholderProps {
  icon: ReactNode
  title: string
  description: string
  color: 'red' | 'blue' | 'purple' | 'orange' | 'green'
  stats: QuickStat[]
  features: string[]
}

const colorMap = {
  red: { bg: 'bg-[#fef2f2]', text: 'text-[#ef4444]', darkBg: 'dark:bg-[#450a0a]', darkText: 'dark:text-[#f87171]', accent: '#ef4444' },
  blue: { bg: 'bg-[#eff6ff]', text: 'text-[#3b82f6]', darkBg: 'dark:bg-[#0c1a2e]', darkText: 'dark:text-[#60a5fa]', accent: '#3b82f6' },
  purple: { bg: 'bg-[#ede9fe]', text: 'text-[#7c3aed]', darkBg: 'dark:bg-[#2e1065]', darkText: 'dark:text-[#a78bfa]', accent: '#7c3aed' },
  orange: { bg: 'bg-[#fff7ed]', text: 'text-[#f59e0b]', darkBg: 'dark:bg-[#431407]', darkText: 'dark:text-[#fcd34d]', accent: '#f59e0b' },
  green: { bg: 'bg-[#ecfdf5]', text: 'text-[#10b981]', darkBg: 'dark:bg-[#022c22]', darkText: 'dark:text-[#34d399]', accent: '#10b981' },
}

const statColorMap = {
  red: 'bg-[#fef2f2] text-[#ef4444] dark:bg-[#450a0a] dark:text-[#f87171]',
  blue: 'bg-[#eff6ff] text-[#3b82f6] dark:bg-[#0c1a2e] dark:text-[#60a5fa]',
  purple: 'bg-[#ede9fe] text-[#7c3aed] dark:bg-[#2e1065] dark:text-[#a78bfa]',
  orange: 'bg-[#fff7ed] text-[#f59e0b] dark:bg-[#431407] dark:text-[#fcd34d]',
  green: 'bg-[#ecfdf5] text-[#10b981] dark:bg-[#022c22] dark:text-[#34d399]',
}

export default function ModulePlaceholder({
  icon,
  title,
  description,
  color,
  stats,
  features,
}: ModulePlaceholderProps) {
  const c = colorMap[color]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Module hero */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text} ${c.darkBg} ${c.darkText}`}>
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="mr-1">
              <path d="M6.5 1v8M3 6l3.5 3.5L10 6M1.5 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
          </Button>
          <Button variant="primary" size="sm">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="mr-1">
              <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            New Record
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="flex flex-col gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${statColorMap[stat.color]}`}>
              {i + 1}
            </div>
            <div className="text-xl font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            {stat.trend && (
              <div className={`text-xs font-medium flex items-center gap-1 ${stat.trendType === 'up' ? 'text-success' : stat.trendType === 'down' ? 'text-danger' : 'text-muted-foreground'}`}>
                {stat.trendType === 'up' && '↑'}
                {stat.trendType === 'down' && '↓'}
                {stat.trend}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Feature cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Module Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((feature, i) => (
            <button
              key={i}
              className="flex items-center gap-3 p-4 bg-card border border-border rounded-[var(--radius)] hover:border-primary/40 hover:shadow-sm transition-all text-left cursor-pointer group"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.text} ${c.darkBg} ${c.darkText} group-hover:scale-105 transition-transform`}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 6.5h9M7 2.5l4.5 4-4.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{feature}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Coming soon notice */}
      <Card className="flex items-center gap-4 !bg-muted/40 !border-dashed">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="var(--muted-foreground)" strokeWidth="1.4" />
            <path d="M9 5v4l2.5 2.5" stroke="var(--muted-foreground)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">Full module in development</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            The complete {title} module is being built using this design system. Dashboard, Staff, and Payroll modules are fully implemented.
          </p>
        </div>
        <Badge variant="warning" className="ml-auto shrink-0">Coming soon</Badge>
      </Card>
    </div>
  )
}
