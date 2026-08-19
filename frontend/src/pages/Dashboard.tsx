import { useEffect, useState } from 'react'
import StatCard from '../components/ui/StatCard'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useAuth } from '../lib/auth'
import { getDashboardOverview, type DashboardOverviewData } from '../api/dashboard'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'

function formatCurrency(amount: number | string | undefined | null): string {
  if (amount == null) return '$0.00'
  const num = typeof amount === 'number' ? amount : Number(amount)
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const DEPT_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Dashboard({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardOverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardOverview()
      .then((res) => setData(res.data))
      .catch((err) => console.error('Could not load dashboard overview:', err))
      .finally(() => setLoading(false))
  }, [])

  const m = data?.metrics

  const departmentPieData = data?.departments?.map((d, idx) => ({
    name: d.name,
    value: Math.max(1, d.staffCount),
    color: DEPT_COLORS[idx % DEPT_COLORS.length],
  })) || []

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* ─── Top Welcome & Quick Actions Bar ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-accent/20 border border-border rounded-[var(--radius-lg)] p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Enterprise Management System
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            Welcome back, {user?.name?.split(' ')[0] || 'Administrator'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Here is your live real-time executive operations summary for today.
          </p>
        </div>

        {/* Quick Navigate Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <>
              <Button size="sm" variant="outline" onClick={() => onNavigate('attendance')}>
                Attendance
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate('projects')}>
                Projects & Tasks
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate('crm')}>
                CRM
              </Button>
              <Button size="sm" variant="primary" onClick={() => onNavigate('payroll')}>
                Payroll
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── KPI Metric Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          iconColor="blue"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 15.5c0-2.5 3-4 6-4s6 1.5 6 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          value={String(m?.staff.active ?? 0)}
          label="Active Staff Members"
          trend={`${m?.staff.departmentsCount ?? 0} Departments`}
          trendType="neutral"
        />
        <StatCard
          iconColor="green"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M6 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          value={`${m?.attendance.rate ?? 0}%`}
          label="Today's Attendance Rate"
          trend={`${m?.attendance.present ?? 0} Present • ${m?.attendance.late ?? 0} Late`}
          trendType={m?.attendance.rate && m.attendance.rate >= 80 ? 'up' : 'neutral'}
        />
        <StatCard
          iconColor="purple"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5l7 4v7l-7 4-7-4v-7l7-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          }
          value={String(m?.projects.active ?? 0)}
          label="Active Projects"
          trend={`${m?.projects.completionRate ?? 0}% tasks completed`}
          trendType="up"
        />
        <StatCard
          iconColor="orange"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9 5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          value={formatCurrency(m?.payroll.totalGross ?? 0)}
          label="Monthly Payroll Expense"
          trend={`${m?.crm.wonLeads ?? 0} CRM Deals Won`}
          trendType="neutral"
        />
      </div>

      {/* ─── Main Content Row 1: Charts ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Attendance Flow */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Weekly Workforce Attendance</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Staff presence, approved leaves, and unrecorded absences this week.
              </p>
            </div>
            <Badge variant="success">{m?.attendance.present ?? 0} Present Today</Badge>
          </CardHeader>
          <div className="h-72 w-full pt-4">
            {data?.weeklyAttendance ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.weeklyAttendance} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'var(--foreground)',
                    }}
                  />
                  <Area type="monotone" dataKey="present" name="Present Staff" stroke="#10b981" fill="url(#presentGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="leave" name="On Leave" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading attendance chart…</div>
            )}
          </div>
        </Card>

        {/* Department Distribution Donut */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div>
              <CardTitle>Department Headcount</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Staff distribution across teams</p>
            </div>
          </CardHeader>
          <div className="h-52 w-full relative flex items-center justify-center">
            {departmentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {departmentPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-muted-foreground">No department data</div>
            )}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold font-mono text-foreground leading-none">
                {m?.staff.active ?? 0}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase mt-0.5">Staff</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border">
            {data?.departments?.slice(0, 4).map((d, i) => (
              <div key={d.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                <span className="truncate">{d.name}</span>
                <span className="font-bold text-foreground ml-auto">{d.staffCount}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ─── Row 2: Projects Overview & Live Audit Log ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects & CRM Quick Health */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operations & Project Velocity</CardTitle>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('projects')}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                  View All Projects →
                </button>
              )}
            </CardHeader>
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Task Completion Rate</span>
                  <span className="font-bold text-foreground">{m?.projects.completionRate ?? 0}%</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${m?.projects.completionRate ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                <div className="p-2.5 bg-muted/40 rounded border border-border/50">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Active</div>
                  <div className="text-base font-bold text-foreground mt-0.5">{m?.projects.active ?? 0}</div>
                </div>
                <div className="p-2.5 bg-muted/40 rounded border border-border/50">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">In Progress Tasks</div>
                  <div className="text-base font-bold text-info mt-0.5">{m?.projects.inProgressTasks ?? 0}</div>
                </div>
                <div className="p-2.5 bg-muted/40 rounded border border-border/50">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Done Tasks</div>
                  <div className="text-base font-bold text-success mt-0.5">{m?.projects.doneTasks ?? 0}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* CRM Pipeline Health */}
          <Card>
            <CardHeader>
              <CardTitle>CRM Sales Pipeline</CardTitle>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('crm')}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                  Open CRM →
                </button>
              )}
            </CardHeader>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-muted/40 rounded border border-border/50">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Leads</div>
                <div className="text-lg font-bold text-foreground mt-0.5">{m?.crm.totalLeads ?? 0}</div>
              </div>
              <div className="p-3 bg-muted/40 rounded border border-border/50">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Deals Won</div>
                <div className="text-lg font-bold text-success mt-0.5">{m?.crm.wonLeads ?? 0}</div>
              </div>
              <div className="p-3 bg-muted/40 rounded border border-border/50">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Active Accounts</div>
                <div className="text-lg font-bold text-primary mt-0.5">{m?.crm.activeCustomers ?? 0}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Live System Activity Log Stream */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <CardTitle>Live Activity Stream</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Real-time audit</span>
          </CardHeader>

          <div className="divide-y divide-border -mx-4 px-4 overflow-y-auto max-h-80">
            {data?.activityStream && data.activityStream.length > 0 ? (
              data.activityStream.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    {log.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-foreground truncate">{log.userName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 leading-snug">
                      <span className="capitalize font-medium text-foreground">{log.action}</span>{' '}
                      {log.entityType.replace('_', ' ')}{' '}
                      {log.entityId ? <span className="font-mono text-[10px] opacity-70">({log.entityId.slice(0, 8)})</span> : ''}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No recent activity recorded yet.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border text-center">
            <span className="text-[11px] text-muted-foreground">
              Connected to Postgres Enterprise Engine
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
