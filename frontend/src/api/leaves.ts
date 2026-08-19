import { apiFetch } from './client'

export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveType {
  id: string
  name: string
  daysPerYear: number
  isPaid: boolean
  isActive: boolean
}

export interface LeaveEmployee {
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

export interface LeaveApprover {
  id: string
  name: string
  email: string
  role: string
}

export interface LeaveRequest {
  id: string
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  days: number
  reason: string | null
  status: LeaveStatus
  approvedById: string | null
  approvedAt: string | null
  createdAt: string | null
  leaveType: LeaveType | null
  employee: LeaveEmployee | null
  approvedBy: LeaveApprover | null
}

export interface LeaveBalance {
  leaveTypeId: string
  name: string
  daysPerYear: number
  isPaid: boolean
  usedDays: number
  remainingDays: number
}

export interface LeaveStats {
  year: number
  totalPending: number
  totalApprovedThisYear: number
  totalRejectedThisYear: number
  activeOnLeaveToday: number
  balances: LeaveBalance[]
}

export interface LeaveListResponse {
  success: true
  records: LeaveRequest[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateLeaveTypeInput {
  name: string
  daysPerYear: number
  isPaid?: boolean
  isActive?: boolean
}

export interface UpdateLeaveTypeInput {
  name?: string
  daysPerYear?: number
  isPaid?: boolean
  isActive?: boolean
}

export interface CreateLeaveRequestInput {
  employeeId?: string
  leaveTypeId: string
  startDate: string
  endDate: string
  reason?: string | null
}

export async function listLeaveTypes() {
  return apiFetch<{ success: true; leaveTypes: LeaveType[] }>(
    '/api/leaves/types',
  )
}

export async function createLeaveType(input: CreateLeaveTypeInput) {
  return apiFetch<{ success: true; message: string; leaveType: LeaveType }>(
    '/api/leaves/types',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export async function updateLeaveType(id: string, input: UpdateLeaveTypeInput) {
  return apiFetch<{ success: true; message: string; leaveType: LeaveType }>(
    `/api/leaves/types/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
}

export async function listLeaves(
  params: {
    status?: LeaveStatus | 'all'
    leaveTypeId?: string
    employeeId?: string
    departmentId?: string
    startDate?: string
    endDate?: string
    search?: string
    page?: number
    limit?: number
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<LeaveListResponse>(
    `/api/leaves${query.size ? `?${query}` : ''}`,
  )
}

export async function getLeaveStats(
  params: {
    year?: number
    employeeId?: string
    departmentId?: string
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<{ success: true; stats: LeaveStats }>(
    `/api/leaves/stats${query.size ? `?${query}` : ''}`,
  )
}

export async function createLeaveRequest(input: CreateLeaveRequestInput) {
  return apiFetch<{ success: true; message: string; leaveRequest: LeaveRequest }>(
    '/api/leaves',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export async function updateLeaveStatus(
  id: string,
  status: 'approved' | 'rejected',
  reason?: string | null,
) {
  return apiFetch<{ success: true; message: string; leaveRequest: LeaveRequest }>(
    `/api/leaves/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    },
  )
}

export async function cancelLeaveRequest(id: string) {
  return apiFetch<{ success: true; message: string; id: string }>(
    `/api/leaves/${id}`,
    {
      method: 'DELETE',
    },
  )
}
