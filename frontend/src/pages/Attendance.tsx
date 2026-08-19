import { useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import Badge, { statusBadge } from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'
import DataTable, { type Column } from '../components/ui/DataTable'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import Tabs from '../components/ui/Tabs'
import { useAuth } from '../lib/auth'
import {
  checkIn,
  checkOut,
  deleteAttendance,
  getAttendanceStats,
  getTodayAttendance,
  listAttendance,
  recordManualAttendance,
  updateAttendance,
  type AttendanceRecord,
  type AttendanceStats,
  type AttendanceStatus,
  type ManualAttendanceInput,
} from '../api/attendance'
import {
  cancelLeaveRequest,
  createLeaveRequest,
  createLeaveType,
  getLeaveStats,
  listLeaves,
  listLeaveTypes,
  updateLeaveStatus,
  type LeaveRequest,
  type LeaveStats,
  type LeaveStatus,
  type LeaveType,
} from '../api/leaves'
import { listEmployees, type Employee } from '../api/employees'
import { listDepartments, type Department } from '../api/departments'

/* ─── Attendance Status Badge ─────────────────────────────────────────────── */

function attendanceBadgeVariant(status: AttendanceStatus): 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gray' {
  switch (status) {
    case 'present':
      return 'success'
    case 'late':
      return 'warning'
    case 'absent':
      return 'danger'
    case 'half_day':
      return 'info'
    case 'leave':
      return 'purple'
    default:
      return 'gray'
  }
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case 'half_day':
      return 'Half Day'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return '—'
  }
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

function getTodayDateString(): string {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

export default function Attendance() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'policies'>('attendance')

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState(new Date())

  // Today punch status
  const [todayPunch, setTodayPunch] = useState<{
    hasCheckedIn: boolean
    hasCheckedOut: boolean
    attendance: AttendanceRecord | null
  }>({
    hasCheckedIn: false,
    hasCheckedOut: false,
    attendance: null,
  })
  const [punchLoading, setPunchLoading] = useState(false)
  const [punchNotes, setPunchNotes] = useState('')
  const [punchError, setPunchError] = useState('')
  const [punchSuccess, setPunchSuccess] = useState('')

  // Attendance Tab State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)
  const [attendanceTotal, setAttendanceTotal] = useState(0)
  const [attendancePage, setAttendancePage] = useState(1)
  const [attendanceLimit] = useState(12)
  const [attendanceDate, setAttendanceDate] = useState<string>(getTodayDateString())
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<AttendanceStatus | 'all'>('all')
  const [attendanceDeptFilter, setAttendanceDeptFilter] = useState<string>('')
  const [attendanceSearch, setAttendanceSearch] = useState<string>('')
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  // Leave Requests Tab State
  const [leaveRecords, setLeaveRecords] = useState<LeaveRequest[]>([])
  const [leaveStats, setLeaveStats] = useState<LeaveStats | null>(null)
  const [leaveTotal, setLeaveTotal] = useState(0)
  const [leavePage, setLeavePage] = useState(1)
  const [leaveLimit] = useState(12)
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<LeaveStatus | 'all'>('all')
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('')
  const [leaveSearch, setLeaveSearch] = useState<string>('')
  const [leaveLoading, setLeaveLoading] = useState(false)

  // Reference Data
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  // Modals State
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null)
  const [manualForm, setManualForm] = useState<ManualAttendanceInput>({
    employeeId: '',
    date: getTodayDateString(),
    checkIn: '',
    checkOut: '',
    workHours: undefined,
    status: 'present',
    notes: '',
  })
  const [savingManual, setSavingManual] = useState(false)
  const [manualError, setManualError] = useState('')

  // Apply Leave Modal State
  const [applyLeaveModalOpen, setApplyLeaveModalOpen] = useState(false)
  const [applyLeaveForm, setApplyLeaveForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: getTodayDateString(),
    endDate: getTodayDateString(),
    reason: '',
  })
  const [savingLeave, setSavingLeave] = useState(false)
  const [applyLeaveError, setApplyLeaveError] = useState('')

  // Leave Type Policy Modal State
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [typeForm, setTypeForm] = useState({
    name: '',
    daysPerYear: 10,
    isPaid: true,
    isActive: true,
  })
  const [savingType, setSavingType] = useState(false)
  const [typeError, setTypeError] = useState('')

  const isHrOrAdmin = user?.role === 'ADMIN' || user?.role === 'HR'
  const isManager = user?.role === 'MANAGER'
  const canReviewLeaves = isHrOrAdmin || isManager

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load today punch status
  async function refreshTodayPunch() {
    try {
      const res = await getTodayAttendance()
      setTodayPunch({
        hasCheckedIn: res.hasCheckedIn,
        hasCheckedOut: res.hasCheckedOut,
        attendance: res.attendance,
      })
    } catch {
      // Ignored
    }
  }

  // Load reference data independently
  async function loadReferenceData() {
    listLeaveTypes()
      .then((res) => {
        if (res?.leaveTypes) setLeaveTypes(res.leaveTypes)
      })
      .catch((err) => console.error('Could not load leave types:', err))

    listDepartments({ isActive: true, limit: 100 })
      .then((res) => {
        if (res?.departments) setDepartments(res.departments)
      })
      .catch((err) => console.error('Could not load departments:', err))

    listEmployees({ limit: 100 })
      .then((res) => {
        if (res?.employees) setEmployees(res.employees)
      })
      .catch((err) => console.error('Could not load employees:', err))
  }

  // Load Attendance data
  async function loadAttendanceData() {
    setAttendanceLoading(true)
    try {
      const [listRes, statsRes] = await Promise.all([
        listAttendance({
          date: attendanceDate || undefined,
          status: attendanceStatusFilter !== 'all' ? attendanceStatusFilter : undefined,
          departmentId: attendanceDeptFilter || undefined,
          search: attendanceSearch || undefined,
          page: attendancePage,
          limit: attendanceLimit,
        }),
        getAttendanceStats({
          date: attendanceDate || undefined,
          departmentId: attendanceDeptFilter || undefined,
        }),
      ])
      setAttendanceRecords(listRes.records)
      setAttendanceTotal(listRes.pagination.total)
      setAttendanceStats(statsRes.stats)
    } catch (err) {
      console.error('Could not load attendance:', err)
    } finally {
      setAttendanceLoading(false)
    }
  }

  // Load Leave data
  async function loadLeaveData() {
    setLeaveLoading(true)
    try {
      const [listRes, statsRes] = await Promise.all([
        listLeaves({
          status: leaveStatusFilter !== 'all' ? leaveStatusFilter : undefined,
          leaveTypeId: leaveTypeFilter || undefined,
          search: leaveSearch || undefined,
          page: leavePage,
          limit: leaveLimit,
        }),
        getLeaveStats({}),
      ])
      setLeaveRecords(listRes.records)
      setLeaveTotal(listRes.pagination.total)
      setLeaveStats(statsRes.stats)
    } catch (err) {
      console.error('Could not load leaves:', err)
    } finally {
      setLeaveLoading(false)
    }
  }

  useEffect(() => {
    void refreshTodayPunch()
    void loadReferenceData()
  }, [])

  useEffect(() => {
    if (activeTab === 'attendance') {
      const t = setTimeout(() => {
        void loadAttendanceData()
      }, 200)
      return () => clearTimeout(t)
    }
  }, [activeTab, attendanceDate, attendanceStatusFilter, attendanceDeptFilter, attendanceSearch, attendancePage])

  useEffect(() => {
    if (activeTab === 'leaves' || activeTab === 'policies') {
      void loadReferenceData()
      const t = setTimeout(() => {
        void loadLeaveData()
      }, 200)
      return () => clearTimeout(t)
    }
  }, [activeTab, leaveStatusFilter, leaveTypeFilter, leaveSearch, leavePage])

  // Open Apply Leave Modal
  function openApplyLeave() {
    void loadReferenceData()
    setApplyLeaveError('')
    setApplyLeaveForm({
      employeeId: '',
      leaveTypeId: leaveTypes[0]?.id || '',
      startDate: getTodayDateString(),
      endDate: getTodayDateString(),
      reason: '',
    })
    setApplyLeaveModalOpen(true)
  }

  // Open Manual Attendance Modal
  function openManualAttendance(record?: AttendanceRecord) {
    void loadReferenceData()
    setManualError('')
    if (record) {
      setEditingAttendance(record)
      setManualForm({
        employeeId: record.employeeId,
        date: record.date,
        checkIn: record.checkIn ? record.checkIn.slice(0, 16) : '',
        checkOut: record.checkOut ? record.checkOut.slice(0, 16) : '',
        workHours: record.workHours ?? undefined,
        status: record.status,
        notes: record.notes ?? '',
      })
    } else {
      setEditingAttendance(null)
      setManualForm({
        employeeId: employees[0]?.id || '',
        date: attendanceDate || getTodayDateString(),
        checkIn: '',
        checkOut: '',
        workHours: undefined,
        status: 'present',
        notes: '',
      })
    }
    setManualModalOpen(true)
  }

  // Handle Punch In
  async function handleCheckIn() {
    setPunchLoading(true)
    setPunchError('')
    setPunchSuccess('')
    try {
      const res = await checkIn(punchNotes || null)
      setPunchSuccess(`Successfully clocked in at ${formatTime(res.attendance.checkIn)}`)
      setPunchNotes('')
      await refreshTodayPunch()
      if (activeTab === 'attendance') await loadAttendanceData()
    } catch (err) {
      setPunchError(err instanceof Error ? err.message : 'Could not clock in')
    } finally {
      setPunchLoading(false)
    }
  }

  // Handle Punch Out
  async function handleCheckOut() {
    setPunchLoading(true)
    setPunchError('')
    setPunchSuccess('')
    try {
      const res = await checkOut(punchNotes || null)
      setPunchSuccess(`Successfully clocked out at ${formatTime(res.attendance.checkOut)} (${res.attendance.workHours} hrs)`)
      setPunchNotes('')
      await refreshTodayPunch()
      if (activeTab === 'attendance') await loadAttendanceData()
    } catch (err) {
      setPunchError(err instanceof Error ? err.message : 'Could not clock out')
    } finally {
      setPunchLoading(false)
    }
  }

  // Handle Manual Attendance Submit
  async function handleSaveManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manualForm.employeeId && !editingAttendance) {
      setManualError('Please select an employee')
      return
    }
    setSavingManual(true)
    setManualError('')
    try {
      if (editingAttendance) {
        await updateAttendance(editingAttendance.id, {
          date: manualForm.date,
          checkIn: manualForm.checkIn ? new Date(manualForm.checkIn).toISOString() : null,
          checkOut: manualForm.checkOut ? new Date(manualForm.checkOut).toISOString() : null,
          workHours: manualForm.workHours,
          status: manualForm.status,
          notes: manualForm.notes,
        })
      } else {
        await recordManualAttendance({
          employeeId: manualForm.employeeId,
          date: manualForm.date,
          checkIn: manualForm.checkIn ? new Date(manualForm.checkIn).toISOString() : null,
          checkOut: manualForm.checkOut ? new Date(manualForm.checkOut).toISOString() : null,
          workHours: manualForm.workHours,
          status: manualForm.status,
          notes: manualForm.notes,
        })
      }
      setManualModalOpen(false)
      setEditingAttendance(null)
      await loadAttendanceData()
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Could not save attendance record')
    } finally {
      setSavingManual(false)
    }
  }

  // Handle Delete Attendance
  async function handleDeleteAttendance(record: AttendanceRecord) {
    if (!window.confirm(`Are you sure you want to delete attendance record for ${record.employee?.name ?? 'employee'} on ${record.date}?`)) {
      return
    }
    try {
      await deleteAttendance(record.id)
      await loadAttendanceData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete record')
    }
  }

  // Handle Apply Leave Submit
  async function handleApplyLeave(e: React.FormEvent) {
    e.preventDefault()
    if (!applyLeaveForm.leaveTypeId) {
      setApplyLeaveError('Please select a leave type')
      return
    }
    setSavingLeave(true)
    setApplyLeaveError('')
    try {
      await createLeaveRequest({
        employeeId: isHrOrAdmin && applyLeaveForm.employeeId ? applyLeaveForm.employeeId : undefined,
        leaveTypeId: applyLeaveForm.leaveTypeId,
        startDate: applyLeaveForm.startDate,
        endDate: applyLeaveForm.endDate,
        reason: applyLeaveForm.reason || null,
      })
      setApplyLeaveModalOpen(false)
      setApplyLeaveForm({
        employeeId: '',
        leaveTypeId: '',
        startDate: getTodayDateString(),
        endDate: getTodayDateString(),
        reason: '',
      })
      await loadLeaveData()
    } catch (err) {
      setApplyLeaveError(err instanceof Error ? err.message : 'Could not submit leave request')
    } finally {
      setSavingLeave(false)
    }
  }

  // Handle Leave Review (Approve / Reject)
  async function handleReviewLeave(leaveId: string, status: 'approved' | 'rejected') {
    const actionText = status === 'approved' ? 'approve' : 'reject'
    if (!window.confirm(`Are you sure you want to ${actionText} this leave request?`)) return
    try {
      await updateLeaveStatus(leaveId, status)
      await loadLeaveData()
      if (status === 'approved') await loadAttendanceData()
    } catch (err) {
      alert(err instanceof Error ? err.message : `Could not ${actionText} leave request`)
    }
  }

  // Handle Cancel Leave
  async function handleCancelLeave(leaveId: string) {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return
    try {
      await cancelLeaveRequest(leaveId)
      await loadLeaveData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not cancel leave request')
    }
  }

  // Handle Create Leave Type
  async function handleCreateLeaveType(e: React.FormEvent) {
    e.preventDefault()
    if (!typeForm.name.trim()) {
      setTypeError('Policy name is required')
      return
    }
    setSavingType(true)
    setTypeError('')
    try {
      await createLeaveType({
        name: typeForm.name.trim(),
        daysPerYear: Number(typeForm.daysPerYear),
        isPaid: typeForm.isPaid,
        isActive: typeForm.isActive,
      })
      setTypeModalOpen(false)
      setTypeForm({ name: '', daysPerYear: 10, isPaid: true, isActive: true })
      await loadReferenceData()
      await loadLeaveData()
    } catch (err) {
      setTypeError(err instanceof Error ? err.message : 'Could not create leave type')
    } finally {
      setSavingType(false)
    }
  }

  // Calculate live working duration for today
  const liveWorkingHours = useMemo(() => {
    if (!todayPunch.attendance?.checkIn) return null
    const checkInTime = new Date(todayPunch.attendance.checkIn).getTime()
    const endTime = todayPunch.attendance.checkOut ? new Date(todayPunch.attendance.checkOut).getTime() : currentTime.getTime()
    const diffMs = Math.max(0, endTime - checkInTime)
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [todayPunch.attendance, currentTime])

  // Attendance Table Columns
  const attendanceColumns: Column<AttendanceRecord>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.employee?.avatarUrl ? (
            <img
              src={row.employee.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs">
              {(row.employee?.firstName?.[0] ?? 'E') + (row.employee?.lastName?.[0] ?? '')}
            </div>
          )}
          <div>
            <div className="font-medium text-foreground text-sm leading-tight">
              {row.employee?.name || 'Unknown Employee'}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.employee?.designation || row.employee?.employeeCode || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'employeeCode',
      header: 'Emp Code',
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {row.employee?.employeeCode ?? '—'}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.employee?.department?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => <span className="font-mono text-xs">{row.date}</span>,
    },
    {
      key: 'checkIn',
      header: 'Check In',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {row.checkIn ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span>{formatTime(row.checkIn)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'checkOut',
      header: 'Check Out',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {row.checkOut ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-info" />
              <span>{formatTime(row.checkOut)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'workHours',
      header: 'Hours',
      render: (row) => (
        <span className="text-xs font-semibold">
          {row.workHours != null ? `${row.workHours} hrs` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={attendanceBadgeVariant(row.status)}>
          {formatStatusLabel(row.status)}
        </Badge>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (row) => (
        <span className="text-xs text-muted-foreground max-w-[150px] truncate block" title={row.notes || ''}>
          {row.notes || '—'}
        </span>
      ),
    },
    ...(isHrOrAdmin
      ? [
        {
          key: 'actions',
          header: 'Actions',
          render: (row: AttendanceRecord) => (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openManualAttendance(row)}
                className="text-xs text-primary hover:underline font-medium cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => void handleDeleteAttendance(row)}
                className="text-xs text-danger hover:underline font-medium cursor-pointer"
              >
                Delete
              </button>
            </div>
          ),
        },
      ]
      : []),
  ]

  // Leave Table Columns
  const leaveColumns: Column<LeaveRequest>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.employee?.avatarUrl ? (
            <img
              src={row.employee.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs">
              {(row.employee?.firstName?.[0] ?? 'E') + (row.employee?.lastName?.[0] ?? '')}
            </div>
          )}
          <div>
            <div className="font-medium text-foreground text-sm leading-tight">
              {row.employee?.name || 'Unknown Employee'}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.employee?.department?.name || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'leaveType',
      header: 'Leave Type',
      render: (row) => (
        <Badge variant={row.leaveType?.isPaid ? 'info' : 'gray'}>
          {row.leaveType?.name ?? 'Leave'}
        </Badge>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => (
        <div>
          <div className="text-xs font-medium text-foreground">
            {row.startDate} → {row.endDate}
          </div>
          <div className="text-[11px] text-muted-foreground font-semibold">
            {row.days} {row.days === 1 ? 'day' : 'days'}
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span className="text-xs text-muted-foreground max-w-[200px] truncate block" title={row.reason || ''}>
          {row.reason || 'No reason provided'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Applied On',
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={statusBadge(row.status)}>
          {formatStatusLabel(row.status)}
        </Badge>
      ),
    },
    {
      key: 'approvedBy',
      header: 'Reviewer',
      render: (row) => (
        row.approvedBy ? (
          <div className="text-xs">
            <div className="font-medium text-foreground">{row.approvedBy.name}</div>
            <div className="text-[10px] text-muted-foreground">{formatDate(row.approvedAt)}</div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'pending' && canReviewLeaves && (
            <>
              <button
                onClick={() => void handleReviewLeave(row.id, 'approved')}
                className="px-2 py-1 text-xs font-semibold rounded bg-success/15 text-success hover:bg-success/25 transition-colors cursor-pointer"
              >
                Approve
              </button>
              <button
                onClick={() => void handleReviewLeave(row.id, 'rejected')}
                className="px-2 py-1 text-xs font-semibold rounded bg-danger/15 text-danger hover:bg-danger/25 transition-colors cursor-pointer"
              >
                Reject
              </button>
            </>
          )}
          {row.status === 'pending' && (isHrOrAdmin || row.employee?.id === user?.employee?.id) && (
            <button
              onClick={() => void handleCancelLeave(row.id)}
              className="text-xs text-muted-foreground hover:text-danger hover:underline cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ]

  const tabsConfig = [
    { id: 'attendance', label: 'Daily Attendance' },
    { id: 'leaves', label: 'Leave Requests', badge: leaveStats?.totalPending || undefined },
    { id: 'policies', label: 'Leave Balances & Policies' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* ─── Top Live Punch & Status Bar ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Clock & User Punch Widget */}
        <Card className="lg:col-span-2 relative overflow-hidden bg-gradient-to-r from-card to-accent/20 border border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${todayPunch.hasCheckedIn && !todayPunch.hasCheckedOut
                      ? 'bg-success'
                      : todayPunch.hasCheckedOut
                        ? 'bg-info'
                        : 'bg-warning'
                      }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${todayPunch.hasCheckedIn && !todayPunch.hasCheckedOut
                      ? 'bg-success'
                      : todayPunch.hasCheckedOut
                        ? 'bg-info'
                        : 'bg-warning'
                      }`}
                  />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {todayPunch.hasCheckedIn && !todayPunch.hasCheckedOut
                    ? 'Currently Clocked In'
                    : todayPunch.hasCheckedOut
                      ? 'Clocked Out For Today'
                      : 'Not Clocked In Yet'}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </h2>
              <p className="text-xs text-muted-foreground">
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Live Counter & Check In / Out Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {liveWorkingHours && (
                <div className="px-3 py-2 bg-muted/60 rounded-md text-center border border-border/50">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Today's Duration</div>
                  <div className="text-sm font-mono font-bold text-foreground">{liveWorkingHours}</div>
                </div>
              )}

              <div className="flex items-center gap-2">
                {!todayPunch.hasCheckedIn ? (
                  <Button
                    variant="primary"
                    size="md"
                    disabled={punchLoading}
                    onClick={() => void handleCheckIn()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex-1 sm:flex-initial"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-1.5">
                      <path d="M8 3v10M3 8l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {punchLoading ? 'Clocking in…' : 'Clock In'}
                  </Button>
                ) : !todayPunch.hasCheckedOut ? (
                  <Button
                    variant="danger"
                    size="md"
                    disabled={punchLoading}
                    onClick={() => void handleCheckOut()}
                    className="font-semibold flex-1 sm:flex-initial"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-1.5">
                      <path d="M8 13V3M3 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {punchLoading ? 'Clocking out…' : 'Clock Out'}
                  </Button>
                ) : (
                  <div className="px-3 py-2 bg-muted rounded-md text-xs text-muted-foreground font-medium text-center">
                    Check-in: {formatTime(todayPunch.attendance?.checkIn)} | Check-out: {formatTime(todayPunch.attendance?.checkOut)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {(punchError || punchSuccess) && (
            <div className={`mt-3 p-2 rounded text-xs font-medium ${punchError ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-success/10 text-success border border-success/20'}`}>
              {punchError || punchSuccess}
            </div>
          )}
        </Card>

        {/* Quick Leave Quota Highlight Card */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Your Leave Summary</span>
            <Button
              size="sm"
              variant="outline"
              onClick={openApplyLeave}
            >
              Apply Leave
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {leaveStats?.balances && leaveStats.balances.length > 0 ? (
              leaveStats.balances.slice(0, 3).map((b) => (
                <div key={b.leaveTypeId} className="p-2 bg-muted/40 rounded border border-border/50">
                  <div className="text-[11px] text-muted-foreground truncate">{b.name}</div>
                  <div className="text-lg font-bold text-foreground leading-none mt-1">
                    {b.remainingDays}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">/{b.daysPerYear} days left</div>
                </div>
              ))
            ) : leaveTypes.length > 0 ? (
              leaveTypes.slice(0, 3).map((t) => (
                <div key={t.id} className="p-2 bg-muted/40 rounded border border-border/50">
                  <div className="text-[11px] text-muted-foreground truncate">{t.name}</div>
                  <div className="text-lg font-bold text-foreground leading-none mt-1">
                    {t.daysPerYear}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">/{t.daysPerYear} days</div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-xs text-muted-foreground py-2">No leave types configured</div>
            )}
          </div>
        </Card>
      </div>

      {/* ─── Navigation Tabs ─────────────────────────────────────────────────── */}
      <Tabs
        tabs={tabsConfig}
        active={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        actions={
          activeTab === 'attendance' && isHrOrAdmin ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => openManualAttendance()}
            >
              + Record Attendance
            </Button>
          ) : activeTab === 'leaves' ? (
            <Button
              size="sm"
              variant="primary"
              onClick={openApplyLeave}
            >
              + Apply for Leave
            </Button>
          ) : activeTab === 'policies' && isHrOrAdmin ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setTypeForm({ name: '', daysPerYear: 12, isPaid: true, isActive: true })
                setTypeModalOpen(true)
              }}
            >
              + Add Leave Type
            </Button>
          ) : null
        }
      />

      {/* ─── TAB 1: DAILY ATTENDANCE ────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M15 4.5l-8.25 8.25L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              iconColor="green"
              value={attendanceStats ? String(attendanceStats.present) : '0'}
              label="Present Today"
              trend={attendanceStats ? `${attendanceStats.attendanceRate}% attendance rate` : undefined}
              trendType="up"
            />
            <StatCard
              icon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M9 5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
              iconColor="orange"
              value={attendanceStats ? String(attendanceStats.late) : '0'}
              label="Late Arrivals"
              trend={attendanceStats?.late ? 'Check in after 09:30 AM' : 'None today'}
              trendType={attendanceStats?.late ? 'down' : 'neutral'}
            />
            <StatCard
              icon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="3" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M2 7h14M6 2v2M12 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
              iconColor="purple"
              value={attendanceStats ? String(attendanceStats.onLeave) : '0'}
              label="On Approved Leave"
              trendType="neutral"
            />
            <StatCard
              icon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
              iconColor="red"
              value={attendanceStats ? String(attendanceStats.absent) : '0'}
              label="Absent / Unrecorded"
              trend={attendanceStats ? `Avg ${attendanceStats.avgWorkHours} hrs/person` : undefined}
              trendType="neutral"
            />
          </div>

          {/* Filters Bar */}
          <Card padding="sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-40">
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => {
                    setAttendanceDate(e.target.value)
                    setAttendancePage(1)
                  }}
                />
              </div>

              <div className="w-36">
                <Select
                  value={attendanceStatusFilter}
                  onChange={(e) => {
                    setAttendanceStatusFilter(e.target.value as any)
                    setAttendancePage(1)
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="half_day">Half Day</option>
                  <option value="leave">On Leave</option>
                </Select>
              </div>

              {departments.length > 0 && isHrOrAdmin && (
                <div className="w-44">
                  <Select
                    value={attendanceDeptFilter}
                    onChange={(e) => {
                      setAttendanceDeptFilter(e.target.value)
                      setAttendancePage(1)
                    }}
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="flex-1 min-w-[180px]">
                <Input
                  placeholder="Search employee name or code…"
                  value={attendanceSearch}
                  onChange={(e) => {
                    setAttendanceSearch(e.target.value)
                    setAttendancePage(1)
                  }}
                  prefix={
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9.5 9.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  }
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAttendanceDate(getTodayDateString())
                  setAttendanceStatusFilter('all')
                  setAttendanceDeptFilter('')
                  setAttendanceSearch('')
                  setAttendancePage(1)
                }}
              >
                Reset
              </Button>
            </div>
          </Card>

          {/* DataTable */}
          <Card padding="none" className="overflow-hidden">
            {attendanceLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading attendance records…</div>
            ) : (
              <DataTable
                columns={attendanceColumns}
                data={attendanceRecords}
                pageSize={attendanceLimit}
                keyField="id"
                striped
              />
            )}
          </Card>
        </div>
      )}

      {/* ─── TAB 2: LEAVE REQUESTS ─────────────────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M9 5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
              iconColor="orange"
              value={leaveStats ? String(leaveStats.totalPending) : '0'}
              label="Pending Approvals"
              trend={leaveStats?.totalPending ? 'Requires action' : 'All caught up'}
              trendType={leaveStats?.totalPending ? 'down' : 'neutral'}
            />
            <StatCard
              icon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M15 4.5l-8.25 8.25L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              iconColor="green"
              value={leaveStats ? String(leaveStats.totalApprovedThisYear) : '0'}
              label="Approved (This Year)"
              trendType="up"
            />
            <StatCard
              icon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="3" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M2 7h14M6 2v2M12 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
              iconColor="blue"
              value={leaveStats ? String(leaveStats.activeOnLeaveToday) : '0'}
              label="Active on Leave Today"
              trendType="neutral"
            />
            <StatCard
              icon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
              iconColor="red"
              value={leaveStats ? String(leaveStats.totalRejectedThisYear) : '0'}
              label="Rejected Requests"
              trendType="neutral"
            />
          </div>

          {/* Filters Bar */}
          <Card padding="sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-36">
                <Select
                  value={leaveStatusFilter}
                  onChange={(e) => {
                    setLeaveStatusFilter(e.target.value as any)
                    setLeavePage(1)
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </div>

              {leaveTypes.length > 0 && (
                <div className="w-44">
                  <Select
                    value={leaveTypeFilter}
                    onChange={(e) => {
                      setLeaveTypeFilter(e.target.value)
                      setLeavePage(1)
                    }}
                  >
                    <option value="">All Leave Types</option>
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="flex-1 min-w-[180px]">
                <Input
                  placeholder="Search reason or employee name…"
                  value={leaveSearch}
                  onChange={(e) => {
                    setLeaveSearch(e.target.value)
                    setLeavePage(1)
                  }}
                  prefix={
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9.5 9.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  }
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLeaveStatusFilter('all')
                  setLeaveTypeFilter('')
                  setLeaveSearch('')
                  setLeavePage(1)
                }}
              >
                Reset
              </Button>
            </div>
          </Card>

          {/* DataTable */}
          <Card padding="none" className="overflow-hidden">
            {leaveLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading leave requests…</div>
            ) : (
              <DataTable
                columns={leaveColumns}
                data={leaveRecords}
                pageSize={leaveLimit}
                keyField="id"
                striped
              />
            )}
          </Card>
        </div>
      )}

      {/* ─── TAB 3: LEAVE BALANCES & POLICIES ───────────────────────────────── */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          {/* Individual Leave Quotas */}
          <div>
            <h3 className="text-base font-semibold text-foreground mb-3">Leave Balances ({leaveStats?.year ?? new Date().getFullYear()})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(leaveStats?.balances && leaveStats.balances.length > 0
                ? leaveStats.balances
                : leaveTypes.map((t) => ({
                  leaveTypeId: t.id,
                  name: t.name,
                  daysPerYear: t.daysPerYear,
                  isPaid: t.isPaid,
                  usedDays: 0,
                  remainingDays: t.daysPerYear,
                }))
              ).map((b) => {
                const percentUsed = b.daysPerYear > 0 ? Math.min(100, Math.round((b.usedDays / b.daysPerYear) * 100)) : 0
                return (
                  <Card key={b.leaveTypeId} className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-foreground">{b.name}</span>
                        <Badge variant={b.isPaid ? 'success' : 'gray'}>
                          {b.isPaid ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-foreground">{b.remainingDays}</span>
                        <span className="text-xs text-muted-foreground">/ {b.daysPerYear} days remaining</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${percentUsed > 80 ? 'bg-danger' : percentUsed > 50 ? 'bg-warning' : 'bg-primary'
                            }`}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
                      <span>Used: <strong>{b.usedDays} days</strong></span>
                      <span>Total: <strong>{b.daysPerYear} days</strong></span>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Leave Policies Table */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Configured Leave Types & Policies</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Company-wide annual leave quotas, paid leave flags, and active policy status.
                </p>
              </div>
              {isHrOrAdmin && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setTypeForm({ name: '', daysPerYear: 12, isPaid: true, isActive: true })
                    setTypeModalOpen(true)
                  }}
                >
                  + Add Policy
                </Button>
              )}
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3">Policy Name</th>
                    <th className="py-2.5 px-3">Days / Year</th>
                    <th className="py-2.5 px-3">Paid Leave</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.length > 0 ? (
                    leaveTypes.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-medium text-foreground">{t.name}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold">{t.daysPerYear} days</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={t.isPaid ? 'success' : 'gray'}>
                            {t.isPaid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={t.isActive ? 'success' : 'gray'}>
                            {t.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        No leave policies found. Click "+ Add Leave Type" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─── MODAL: MANUAL ATTENDANCE (HR/Admin) ────────────────────────────── */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-[var(--radius)] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {editingAttendance ? 'Edit Attendance Record' : 'Record Manual Attendance'}
              </h3>
              <button
                onClick={() => setManualModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {manualError && (
              <div className="p-2 rounded bg-danger/10 text-danger text-xs font-medium border border-danger/20">
                {manualError}
              </div>
            )}

            <form onSubmit={(e) => void handleSaveManual(e)} className="space-y-3">
              {!editingAttendance && (
                <div>
                  <Select
                    label="Employee *"
                    value={manualForm.employeeId}
                    onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                    required
                  >
                    <option value="">Select employee…</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode}){emp.designation ? ` - ${emp.designation}` : ''}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <Input
                label="Date *"
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Check-In Time"
                  type="datetime-local"
                  value={manualForm.checkIn ?? ''}
                  onChange={(e) => setManualForm({ ...manualForm, checkIn: e.target.value })}
                />
                <Input
                  label="Check-Out Time"
                  type="datetime-local"
                  value={manualForm.checkOut ?? ''}
                  onChange={(e) => setManualForm({ ...manualForm, checkOut: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Status *"
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as any })}
                  required
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="half_day">Half Day</option>
                  <option value="leave">On Leave</option>
                </Select>

                <Input
                  label="Work Hours (Override)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  placeholder="Auto-calculated if blank"
                  value={manualForm.workHours ?? ''}
                  onChange={(e) =>
                    setManualForm({
                      ...manualForm,
                      workHours: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>

              <Input
                label="Notes / Reason"
                placeholder="Optional notes…"
                value={manualForm.notes ?? ''}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setManualModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingManual}>
                  {savingManual ? 'Saving…' : 'Save Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: APPLY LEAVE ─────────────────────────────────────────────── */}
      {applyLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-[var(--radius)] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Apply for Leave</h3>
              <button
                onClick={() => setApplyLeaveModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {applyLeaveError && (
              <div className="p-2 rounded bg-danger/10 text-danger text-xs font-medium border border-danger/20">
                {applyLeaveError}
              </div>
            )}

            <form onSubmit={(e) => void handleApplyLeave(e)} className="space-y-3">
              {isHrOrAdmin && (
                <div>
                  <Select
                    label="Apply for Employee (Optional)"
                    value={applyLeaveForm.employeeId}
                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, employeeId: e.target.value })}
                  >
                    <option value="">Myself ({user?.name})</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode}){emp.designation ? ` - ${emp.designation}` : ''}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <Select
                label="Leave Type *"
                value={applyLeaveForm.leaveTypeId}
                onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, leaveTypeId: e.target.value })}
                required
              >
                <option value="">Select leave type…</option>
                {leaveTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.daysPerYear} days/yr - {t.isPaid ? 'Paid' : 'Unpaid'})
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Date *"
                  type="date"
                  value={applyLeaveForm.startDate}
                  onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, startDate: e.target.value })}
                  required
                />
                <Input
                  label="End Date *"
                  type="date"
                  value={applyLeaveForm.endDate}
                  onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, endDate: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Reason / Comments</label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-border bg-card text-foreground text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                  placeholder="Provide reason for leave request…"
                  value={applyLeaveForm.reason}
                  onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, reason: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setApplyLeaveModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingLeave}>
                  {savingLeave ? 'Submitting…' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD LEAVE TYPE (HR/Admin) ────────────────────────────────── */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-[var(--radius)] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Add Leave Policy</h3>
              <button
                onClick={() => setTypeModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {typeError && (
              <div className="p-2 rounded bg-danger/10 text-danger text-xs font-medium border border-danger/20">
                {typeError}
              </div>
            )}

            <form onSubmit={(e) => void handleCreateLeaveType(e)} className="space-y-3">
              <Input
                label="Policy Name *"
                placeholder="e.g. Parental Leave, Study Leave"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                required
              />

              <Input
                label="Days Per Year *"
                type="number"
                min="0"
                max="365"
                value={typeForm.daysPerYear}
                onChange={(e) => setTypeForm({ ...typeForm, daysPerYear: Number(e.target.value) })}
                required
              />

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeForm.isPaid}
                    onChange={(e) => setTypeForm({ ...typeForm, isPaid: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-ring"
                  />
                  <span>Paid Leave</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeForm.isActive}
                    onChange={(e) => setTypeForm({ ...typeForm, isActive: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-ring"
                  />
                  <span>Active Policy</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setTypeModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingType}>
                  {savingType ? 'Creating…' : 'Create Policy'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
