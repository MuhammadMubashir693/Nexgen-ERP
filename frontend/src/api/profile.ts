import { apiFetch, getAccessToken } from './client'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '')

export interface UpdateProfileInput {
  name?: string
  firstName?: string
  lastName?: string
  phone?: string | null
  address?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  themeAccent?: string
}

export async function updateProfile(input: UpdateProfileInput) {
  return apiFetch<{ success: true; message: string; user: any }>(
    '/api/auth/profile',
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
}

export async function changePassword(newPassword: string) {
  return apiFetch<{ success: true; message: string }>(
    '/api/auth/change-password',
    {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    },
  )
}

export async function uploadAvatar(file: File) {
  const token = getAccessToken()
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await fetch(`${API_URL}/api/employees/me/avatar`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Could not upload avatar')
  }
  return data
}

export async function deleteAvatar() {
  return apiFetch<{ success: true; message: string }>(
    '/api/employees/me/avatar',
    {
      method: 'DELETE',
    },
  )
}
