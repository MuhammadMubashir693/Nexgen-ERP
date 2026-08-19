import { apiFetch } from './client'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave'

export interface AttendanceEmployee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  name: string
  designation: string | null
  avatarUrl: string | null
  department: {
    id: string
    name: string
  } | null
  role: string | null
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  workHours: number | null
  status: AttendanceStatus
  notes: string | null
  createdAt: string
  employee: AttendanceEmployee | null
}

export interface TodayAttendanceStatus {
  hasCheckedIn: boolean
  hasCheckedOut: boolean
  attendance: AttendanceRecord | null
}

export interface AttendanceStats {
  date: string
  totalEmployees: number
  present: number
  late: number
  absent: number
  halfDay: number
  onLeave: number
  attendanceRate: number
  avgWorkHours: number
}

export interface AttendanceListResponse {
  success: true
  records: AttendanceRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ManualAttendanceInput {
  employeeId: string
  date: string
  checkIn?: string | null
  checkOut?: string | null
  workHours?: number | null
  status: AttendanceStatus
  notes?: string | null
}

export interface UpdateAttendanceInput {
  date?: string
  checkIn?: string | null
  checkOut?: string | null
  workHours?: number | null
  status?: AttendanceStatus
  notes?: string | null
}

export async function getTodayAttendance() {
  return apiFetch<{ success: true } & TodayAttendanceStatus>(
    '/api/attendance/today',
  )
}

export async function checkIn(notes?: string | null, timestamp?: string) {
  return apiFetch<{ success: true; message: string; attendance: AttendanceRecord }>(
    '/api/attendance/check-in',
    {
      method: 'POST',
      body: JSON.stringify({ notes, timestamp }),
    },
  )
}

export async function checkOut(notes?: string | null, timestamp?: string) {
  return apiFetch<{ success: true; message: string; attendance: AttendanceRecord }>(
    '/api/attendance/check-out',
    {
      method: 'POST',
      body: JSON.stringify({ notes, timestamp }),
    },
  )
}

export async function listAttendance(
  params: {
    date?: string
    startDate?: string
    endDate?: string
    employeeId?: string
    departmentId?: string
    status?: AttendanceStatus | 'all'
    search?: string
    page?: number
    limit?: number
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<AttendanceListResponse>(
    `/api/attendance${query.size ? `?${query}` : ''}`,
  )
}

export async function getAttendanceStats(
  params: {
    date?: string
    month?: number
    year?: number
    departmentId?: string
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<{ success: true; stats: AttendanceStats }>(
    `/api/attendance/stats${query.size ? `?${query}` : ''}`,
  )
}

export async function recordManualAttendance(input: ManualAttendanceInput) {
  return apiFetch<{ success: true; message: string; attendance: AttendanceRecord }>(
    '/api/attendance/manual',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export async function updateAttendance(id: string, input: UpdateAttendanceInput) {
  return apiFetch<{ success: true; message: string; attendance: AttendanceRecord }>(
    `/api/attendance/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
}

export async function deleteAttendance(id: string) {
  return apiFetch<{ success: true; message: string; id: string }>(
    `/api/attendance/${id}`,
    {
      method: 'DELETE',
    },
  )
}
