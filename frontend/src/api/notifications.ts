import { apiFetch } from './client'

export type NotificationType = 'system' | 'task' | 'leave' | 'project'

export interface AppNotification {
  id: string
  title: string
  message: string | null
  type: NotificationType
  isRead: boolean
  createdAt: string
}

export interface NotificationListResponse {
  success: true
  notifications: AppNotification[]
  unreadCount: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function listNotifications(
  params: {
    isRead?: boolean
    type?: NotificationType
    page?: number
    limit?: number
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<NotificationListResponse>(
    `/api/notifications${query.size ? `?${query}` : ''}`,
  )
}

export async function getUnreadNotificationCount() {
  return apiFetch<{ success: true; unreadCount: number }>('/api/notifications/unread-count')
}

export async function markNotificationRead(id: string) {
  return apiFetch<{ success: true; message: string; notification: AppNotification }>(
    `/api/notifications/${id}/read`,
    { method: 'PATCH' },
  )
}

export async function markAllNotificationsRead() {
  return apiFetch<{ success: true; message: string; updated: number }>(
    '/api/notifications/read-all',
    { method: 'PATCH' },
  )
}

export async function deleteNotification(id: string) {
  return apiFetch<{ success: true; message: string; id: string; deleted: true }>(
    `/api/notifications/${id}`,
    { method: 'DELETE' },
  )
}
