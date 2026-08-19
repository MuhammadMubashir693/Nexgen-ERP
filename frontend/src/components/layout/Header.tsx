import { useState, useRef, useEffect, type ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { formatRoleLabel, getInitials } from '../../lib/user'

export interface Breadcrumb {
  label: string
  id?: string
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'danger'
  title: string
  body: string
  time: string
  read: boolean
}

const notifColor: Record<Notification['type'], string> = {
  info: 'bg-[var(--info-bg)] text-[var(--info)]',
  success: 'bg-[var(--success-bg)] text-[var(--success)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger)]',
}

const notifIcon: Record<Notification['type'], ReactNode> = {
  info: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.5 5.5v4M6.5 4v-.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  success: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 6.5l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  warning: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 1.5l5.5 9.5H1L6.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6.5 5v2.5M6.5 9v.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  danger: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 4.5l4 4M8.5 4.5l-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
}

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ref, cb])
}

function UserAvatar({
  name,
  avatarUrl,
  size = 'sm',
}: {
  name: string
  avatarUrl: string | null
  size?: 'sm' | 'md'
}) {
  const sizeClass = size === 'md' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-[11px]'

  if (avatarUrl) {
    return (
      <div className={`${sizeClass} rounded-full bg-muted overflow-hidden ring-2 ring-border shrink-0`}>
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center ring-2 ring-border shrink-0`}
    >
      {getInitials(name)}
    </div>
  )
}

interface HeaderProps {
  breadcrumbs: Breadcrumb[]
  onNavigate: (id: string) => void
  isDark: boolean
  onToggleDark: () => void
  onMenuClick: () => void
}

export default function Header({
  breadcrumbs,
  onNavigate,
  isDark,
  onToggleDark,
  onMenuClick,
}: HeaderProps) {
  const { user, logout } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifications] = useState<Notification[]>([])

  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useOutsideClick(notifRef, () => setNotifOpen(false))
  useOutsideClick(profileRef, () => setProfileOpen(false))
  useOutsideClick(searchRef, () => setSearchOpen(false))

  const unreadCount = notifications.filter((n) => !n.read).length
  const displayName = user?.name ?? 'User'
  const displayEmail = user?.email ?? ''
  const displayTitle =
    user?.employee?.designation ?? (user?.role ? formatRoleLabel(user.role) : '')

  async function handleSignOut() {
    setProfileOpen(false)
    await logout()
  }

  return (
    <header className="h-14 flex items-center px-4 bg-card border-b border-border shrink-0 gap-3">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="md:hidden w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer shrink-0"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3.5" width="12" height="1.4" rx="0.7" fill="currentColor" />
          <rect x="2" y="7.3" width="12" height="1.4" rx="0.7" fill="currentColor" />
          <rect x="2" y="11.1" width="12" height="1.4" rx="0.7" fill="currentColor" />
        </svg>
      </button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm min-w-0 flex-1">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1
          return (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground/40 shrink-0">
                  <path d="M4 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {isLast ? (
                <span className="font-semibold text-foreground truncate">{crumb.label}</span>
              ) : (
                <button
                  onClick={() => crumb.id && onNavigate(crumb.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer truncate"
                >
                  {crumb.label}
                </button>
              )}
            </span>
          )
        })}
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Search */}
        <div ref={searchRef} className="relative">
          {searchOpen ? (
            <div className="flex items-center gap-2 h-8 px-3 rounded-lg border border-border bg-muted/60 focus-within:border-primary/60 focus-within:bg-card transition-all">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-muted-foreground shrink-0">
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                autoFocus
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
                placeholder="Search modules, staff, records…"
                className="w-52 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchValue('') }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              title="Search (⌘K)"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.22 3.22l1.06 1.06M10.72 10.72l1.06 1.06M3.22 11.78l1.06-1.06M10.72 4.28l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M12.5 8.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen((o) => !o); setProfileOpen(false) }}
            className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            title="Notifications"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5a4.5 4.5 0 014.5 4.5v3l1 1.5H2L3 9V6a4.5 4.5 0 014.5-4.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M6 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-danger text-white text-[9px] font-bold leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications panel */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-[var(--radius-lg)] shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold text-sm text-foreground">Notifications</span>
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Updates from leave requests, tasks, and system alerts will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40 cursor-pointer ${
                          !n.read ? 'bg-accent/20' : ''
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${notifColor[n.type]}`}
                        >
                          {notifIcon[n.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-xs font-semibold text-foreground leading-tight ${!n.read ? '' : 'opacity-70'}`}>
                              {n.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                            {n.body}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-border">
                    <button className="w-full text-xs font-medium text-primary hover:underline cursor-pointer text-center">
                      View all notifications
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* User profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setProfileOpen((o) => !o); setNotifOpen(false) }}
            className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <UserAvatar
              name={displayName}
              avatarUrl={user?.employee?.avatarUrl ?? null}
            />
            <div className="hidden sm:block text-left">
              <div className="text-[12px] font-semibold text-foreground leading-tight truncate max-w-[120px]">
                {displayName}
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">
                {displayTitle}
              </div>
            </div>
            <svg
              width="11"
              height="11"
              viewBox="0 0 11 11"
              fill="none"
              className="text-muted-foreground hidden sm:block"
            >
              <path
                d="M2 3.5l3.5 3.5L9 3.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-[var(--radius-lg)] shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={displayName}
                    avatarUrl={user?.employee?.avatarUrl ?? null}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {displayName}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {displayEmail}
                    </div>
                  </div>
                </div>
              </div>
              {/* Menu items */}
              {[
                { icon: 'M7.5 1.5a6 6 0 110 12 6 6 0 010-12zM7.5 4.5v3l2 1.5', label: 'My Profile', navId: 'profile' },
                { icon: 'M2 3h11M2 7.5h11M2 12h7', label: 'Account Settings', navId: 'settings' },
                { icon: 'M8 1.5H4.5A1.5 1.5 0 003 3v9a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0013 12V6.5L8 1.5zM8 1.5V6.5H13', label: 'My Documents', navId: 'documents' }
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => { setProfileOpen(false); if (item.navId) onNavigate(item.navId) }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-foreground shrink-0">
                    <path d={item.icon} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item.label}
                </button>
              ))}
              <div className="border-t border-border">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors cursor-pointer"
                  onClick={handleSignOut}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                    <path d="M5 12.5H2.5A1.5 1.5 0 011 11V3a1.5 1.5 0 011.5-1.5H5M9.5 10l3.5-3.5L9.5 3M13 6.5H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
