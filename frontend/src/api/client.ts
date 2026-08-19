const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '')

let accessToken = localStorage.getItem('erp_access_token')
let refreshToken = localStorage.getItem('erp_refresh_token')

export function setTokens(access: string, refresh?: string | null) {
  accessToken = access
  localStorage.setItem('erp_access_token', access)
  if (refresh) {
    refreshToken = refresh
    localStorage.setItem('erp_refresh_token', refresh)
  }
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  localStorage.removeItem('erp_access_token')
  localStorage.removeItem('erp_refresh_token')
}

export function getAccessToken() {
  return accessToken
}

async function refreshAccessToken() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!refreshToken || !supabaseUrl || !publishableKey) return false

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) return false
  const data = await response.json()
  if (!data.access_token) return false

  setTokens(data.access_token, data.refresh_token)
  return true
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (response.status === 401 && retry && refreshToken) {
    const refreshed = await refreshAccessToken()
    if (refreshed) return apiFetch<T>(path, options, false)
    clearTokens()
  }

  const text = await response.text()
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text }
  }

  if (!response.ok) {
    throw new Error(data.message ?? `Request failed (${response.status})`)
  }

  return data as T
}

export async function signIn(email: string, password: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error_description ?? data.msg ?? 'Invalid email or password')

  setTokens(data.access_token, data.refresh_token)
  return data
}

export async function signOut() {
  const token = accessToken
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (token && supabaseUrl && publishableKey) {
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => undefined)
  }
  clearTokens()
}
