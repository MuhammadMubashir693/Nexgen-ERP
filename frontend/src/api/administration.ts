import { apiFetch } from './client'

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'approved'
  | 'rejected'
  | 'login'
  | 'logout'

export interface ActivityLogEntry {
  id: string
  action: ActivityAction
  entityType: string
  entityId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  } | null // null means the acting user's account was later deleted
}

export interface ActivityLogListResponse {
  success: true
  logs: ActivityLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ActivityLogStats {
  totalEvents: number
  last30Days: number
  distinctActors: number
  actionBreakdown: Array<{ action: ActivityAction; count: number }>
}

export interface UserManagementStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  byRole: Array<{ role: string; count: number }>
}

export async function listActivityLogs(
  params: {
    userId?: string
    action?: ActivityAction
    entityType?: string
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
  return apiFetch<ActivityLogListResponse>(
    `/api/administration/activity-log${query.size ? `?${query}` : ''}`,
  )
}

export async function getActivityLogStats() {
  return apiFetch<{ success: true; stats: ActivityLogStats }>(
    '/api/administration/activity-log/stats',
  )
}

export async function getUserManagementStats() {
  return apiFetch<{ success: true; stats: UserManagementStats }>(
    '/api/administration/users/stats',
  )
}
