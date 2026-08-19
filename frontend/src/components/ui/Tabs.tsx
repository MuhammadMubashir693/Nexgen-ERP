import { type ReactNode } from 'react'

interface Tab {
  id: string
  label: string
  badge?: number
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
  actions?: ReactNode
}

export default function Tabs({
  tabs,
  active,
  onChange,
  className = '',
  actions,
}: TabsProps) {
  return (
    <div className={`flex items-center border-b border-border ${className}`}>
      <div className="flex items-end gap-0 flex-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-1.5 px-4 h-10 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
              active === tab.id
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${
                  active === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-warning text-white'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      {actions && <div className="flex items-center gap-2 pb-1">{actions}</div>}
    </div>
  )
}
