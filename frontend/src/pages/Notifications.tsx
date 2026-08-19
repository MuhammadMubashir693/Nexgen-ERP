import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type AppNotification,
  type NotificationType,
} from '../api/notifications'

const typeBadge: Record<NotificationType, { label: string; variant: 'gray' | 'info' | 'warning' | 'purple' }> = {
  system: { label: 'System', variant: 'warning' },
  task: { label: 'Task', variant: 'info' },
  leave: { label: 'Leave', variant: 'purple' },
  project: { label: 'Project', variant: 'gray' },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | NotificationType>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await listNotifications({
        isRead: filter === 'unread' ? false : undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
        page,
        limit,
      })
      setNotifications(result.notifications)
      setTotal(result.pagination.total)
      setUnreadCount(result.unreadCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, typeFilter, page])

  async function handleMarkRead(id: string) {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    )
    try {
      await markNotificationRead(id)
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      void load()
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark all as read')
    }
  }

  async function handleDelete(id: string) {
    const previous = notifications
    setNotifications((current) => current.filter((n) => n.id !== id))
    try {
      await deleteNotification(id)
      setTotal((t) => Math.max(0, t - 1))
    } catch (err) {
      setNotifications(previous)
      setError(err instanceof Error ? err.message : 'Could not delete notification')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <Card padding="none">
        <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread of ${total} total` : `${total} total`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as 'all' | 'unread')
                setPage(1)
              }}
            >
              <option value="all">All notifications</option>
              <option value="unread">Unread only</option>
            </Select>
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as 'all' | NotificationType)
                setPage(1)
              }}
            >
              <option value="all">All types</option>
              <option value="system">System</option>
              <option value="task">Task</option>
              <option value="leave">Leave</option>
              <option value="project">Project</option>
            </Select>
            {unreadCount > 0 && (
              <Button variant="secondary" size="md" onClick={() => void handleMarkAllRead()}>
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading notifications…</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No notifications to show</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Updates from leave requests, tasks, and system alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => {
              const badge = typeBadge[n.type]
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-5 py-4 transition-colors ${!n.isRead ? 'bg-accent/15' : ''}`}
                >
                  {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />}
                  <div className={`flex-1 min-w-0 ${n.isRead ? 'ml-[18px]' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm font-semibold text-foreground truncate ${n.isRead ? 'opacity-70' : ''}`}>
                          {n.title}
                        </span>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    {n.message && (
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {!n.isRead && (
                        <button
                          onClick={() => void handleMarkRead(n.id)}
                          className="text-xs font-medium text-primary hover:underline cursor-pointer"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => void handleDelete(n.id)}
                        className="text-xs font-medium text-danger hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
