import { useState, type ReactNode } from 'react'

export interface NavItem {
  id: string
  label: string
  icon: ReactNode
  badge?: number
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

interface SidebarProps {
  groups?: NavGroup[]
  active: string
  onNavigate: (id: string) => void
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

function NavIcon({ d, children }: { d?: string; children?: ReactNode }) {
  if (children) {
    return <>{children}</>
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SidebarInner({
  groups = [],
  active,
  onNavigate,
  collapsed,
  onToggle,
}: {
  groups?: NavGroup[]
  active: string
  onNavigate: (id: string) => void
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex flex-col h-full bg-[var(--sidebar-bg)] border-r border-border">
      {/* Logo row */}
      <div className="flex items-center h-14 px-3 border-b border-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1.5C4.015 1.5 1.5 4.015 1.5 7S4.015 12.5 7 12.5 12.5 9.985 12.5 7 9.985 1.5 7 1.5z"
                  fill="white"
                  fillOpacity="0.25"
                />
                <path
                  d="M4.5 7A2.5 2.5 0 017 4.5"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle cx="7" cy="7" r="1.2" fill="white" />
              </svg>
            </div>
            <span className="font-bold text-[15px] text-foreground tracking-tight truncate">
              Nexgen ERP
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={`w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer shrink-0 ${collapsed ? 'mx-auto' : 'ml-auto'}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M5 3l5 4.5L5 12"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="2" y="3.5" width="11" height="1.4" rx="0.7" fill="currentColor" />
              <rect x="2" y="6.8" width="11" height="1.4" rx="0.7" fill="currentColor" />
              <rect x="2" y="10.1" width="11" height="1.4" rx="0.7" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
            {group.label && !collapsed && (
              <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 h-9 rounded-md text-[13.5px] font-medium transition-all duration-100 cursor-pointer relative group ${
                    collapsed ? 'justify-center px-0' : 'px-3'
                  } ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  <span
                    className={`shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold leading-none">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {/* Collapsed badge dot */}
                  {collapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger" />
                  )}
                  {/* Collapsed tooltip */}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-2.5 whitespace-nowrap rounded-md bg-foreground text-background text-xs font-medium px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                      {item.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 shrink-0">
        {!collapsed ? (
          <div className="space-y-1.5">
            <button className="w-full flex items-center gap-2.5 px-3 h-9 rounded-md hover:bg-muted transition-colors cursor-pointer group">
              <div className="w-6 h-6 rounded-md bg-danger flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                S
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[13px] font-medium text-foreground truncate leading-tight">
                  Sales Team
                </div>
                <div className="text-[10px] text-muted-foreground">Enterprise plan</div>
              </div>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="text-muted-foreground shrink-0"
              >
                <path
                  d="M3 4.5l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <p className="text-[10px] text-muted-foreground/50 text-center pb-0.5 select-none">
              © 2025 Nexgen ERP.io, Inc.
            </p>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <div className="w-7 h-7 rounded-md bg-danger flex items-center justify-center text-white text-xs font-bold">
              S
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Sidebar({
  groups,
  active,
  onNavigate,
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{ width: collapsed ? '56px' : 'var(--sidebar-width)' }}
        className="hidden md:flex flex-col h-full transition-all duration-200 shrink-0"
      >
        <SidebarInner
          groups={groups}
          active={active}
          onNavigate={onNavigate}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[var(--sidebar-width)] md:hidden transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarInner
          groups={groups}
          active={active}
          onNavigate={(id) => {
            onNavigate(id)
            onMobileClose()
          }}
          collapsed={false}
          onToggle={onMobileClose}
        />
      </aside>
    </>
  )
}
