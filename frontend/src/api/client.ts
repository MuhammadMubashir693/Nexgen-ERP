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

/**
 * Sends a password-reset email via Supabase Auth. Available to any user
 * from the login screen (no session required) — distinct from the
 * in-app "Change Password" in Profile > Security, which requires
 * already being logged in.
 */
export async function requestPasswordReset(email: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  // redirectTo must be added to the Supabase project's Auth > URL
  // Configuration > Redirect URLs allowlist, or the email link will fail.
  const redirectTo = `${window.location.origin}/`

  const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, gotrue_meta_security: {}, redirect_to: redirectTo }),
  })

  // Supabase intentionally returns 200 even for unknown emails, to avoid
  // leaking which addresses have accounts. Only genuine request failures
  // (bad payload, rate limiting, etc.) surface as errors here.
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error_description ?? data.msg ?? 'Could not send reset email')
  }
}

/**
 * Completes a password reset. Must be called with the access token
 * Supabase places in the URL hash fragment when the user clicks the
 * reset-password email link (type=recovery).
 */
export async function completePasswordReset(recoveryAccessToken: string, newPassword: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${recoveryAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: newPassword }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error_description ?? data.msg ?? 'Could not reset password')
  }
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
