import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input, { Select } from '../components/ui/Input'
import StatCard from '../components/ui/StatCard'
import DataTable, { type Column } from '../components/ui/DataTable'
import {
  listActivityLogs,
  getActivityLogStats,
  getUserManagementStats,
  type ActivityLogEntry,
  type ActivityAction,
  type ActivityLogStats,
  type UserManagementStats,
} from '../api/administration'

const actionBadge: Record<ActivityAction, 'success' | 'info' | 'danger' | 'warning' | 'gray'> = {
  created: 'success',
  updated: 'info',
  deleted: 'danger',
  approved: 'success',
  rejected: 'danger',
  login: 'gray',
  logout: 'gray',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatEntityType(entityType: string) {
  return entityType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function Administration() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [actionFilter, setActionFilter] = useState<'all' | ActivityAction>('all')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<ActivityLogStats | null>(null)
  const [userStats, setUserStats] = useState<UserManagementStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedLog, setSelectedLog] = useState<ActivityLogEntry | null>(null)

  async function loadLogs() {
    setLoading(true)
    setError('')
    try {
      const result = await listActivityLogs({
        action: actionFilter === 'all' ? undefined : actionFilter,
        search: search || undefined,
        page,
        limit,
      })
      setLogs(result.logs)
      setTotal(result.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load activity log')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const [logStatsRes, userStatsRes] = await Promise.all([
        getActivityLogStats(),
        getUserManagementStats(),
      ])
      setStats(logStatsRes.stats)
      setUserStats(userStatsRes.stats)
    } catch {
      // Stat cards are supplementary — a failure here shouldn't block the log table
    }
  }

  useEffect(() => {
    void loadStats()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLogs(), 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, search, page])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const columns: Column<ActivityLogEntry>[] = [
    {
      key: 'createdAt',
      header: 'Time',
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Actor',
      render: (row) =>
        row.user ? (
          <div>
            <span className="font-medium text-foreground text-sm">{row.user.name}</span>
            <p className="text-xs text-muted-foreground">{row.user.email}</p>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs italic">Deleted user</span>
        ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => <Badge variant={actionBadge[row.action]}>{row.action}</Badge>,
    },
    {
      key: 'entityType',
      header: 'Entity',
      render: (row) => (
        <span className="text-sm text-foreground">
          {formatEntityType(row.entityType)}
          {row.entityId && (
            <span className="text-xs text-muted-foreground font-mono ml-1.5">
              #{row.entityId.slice(0, 8)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (row) =>
        row.newValues || row.oldValues ? (
          <button
            onClick={() => setSelectedLog(row)}
            className="text-primary text-xs font-medium hover:underline cursor-pointer"
          >
            View details
          </button>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="System Users"
          value={String(userStats?.totalUsers ?? '—')}
          trend={userStats ? `${userStats.activeUsers} active` : undefined}
          trendType="neutral"
          iconColor="purple"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2.5 15.75c0-3.176 2.9-5.75 6.5-5.75s6.5 2.574 6.5 5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Total Audit Events"
          value={String(stats?.totalEvents ?? '—')}
          trend={stats ? `${stats.last30Days} in last 30 days` : undefined}
          trendType="neutral"
          iconColor="blue"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4.5 15.75V6.75l4.5-4.5 4.5 4.5v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M2.25 15.75h13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Active Contributors"
          value={String(stats?.distinctActors ?? '—')}
          trend="Distinct users logged"
          trendType="neutral"
          iconColor="green"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M15 4.5L6.75 12.75 3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Roles In Use"
          value={String(userStats?.byRole.length ?? '—')}
          trend={userStats?.byRole.map((r) => `${r.role}: ${r.count}`).join(' · ')}
          trendType="neutral"
          iconColor="orange"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.4 4.4l1.4 1.4M12.2 12.2l1.4 1.4M4.4 13.6l1.4-1.4M12.2 5.8l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* Activity Log table */}
      <Card padding="none">
        <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Activity Log</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} audit event{total === 1 ? '' : 's'} recorded
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search by user name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-64"
            />
            <Select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value as 'all' | ActivityAction)
                setPage(1)
              }}
            >
              <option value="all">All actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </Select>
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
          <div className="p-12 text-center text-sm text-muted-foreground">Loading activity log…</div>
        ) : (
          <DataTable columns={columns} data={logs} keyField="id" pageSize={limit} />
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

      {/* Details modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null)
          }}
        >
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {formatEntityType(selectedLog.entityType)} — {selectedLog.action}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateTime(selectedLog.createdAt)} by {selectedLog.user?.name ?? 'Deleted user'}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>

            {selectedLog.oldValues && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Before
                </h4>
                <pre className="text-xs bg-muted/40 border border-border rounded-md p-3 overflow-x-auto">
                  {JSON.stringify(selectedLog.oldValues, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.newValues && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {selectedLog.oldValues ? 'After' : 'Details'}
                </h4>
                <pre className="text-xs bg-muted/40 border border-border rounded-md p-3 overflow-x-auto">
                  {JSON.stringify(selectedLog.newValues, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
