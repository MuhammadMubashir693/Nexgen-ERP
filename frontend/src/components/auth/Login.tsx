import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useAuth } from '../../lib/auth'
import { requestPasswordReset, completePasswordReset } from '../../api/client'

/**
 * Parses Supabase's recovery link hash fragment, e.g.
 * #access_token=...&type=recovery&refresh_token=...
 * Supabase appends this to the redirect_to URL when the user clicks the
 * password reset email link. Returns null if this isn't a recovery link.
 */
function getRecoveryTokenFromUrl(): string | null {
  if (!window.location.hash) return null
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (params.get('type') !== 'recovery') return null
  return params.get('access_token')
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-md bg-success/10 text-success text-sm border border-success/20">
          If an account exists for <strong>{email}</strong>, a password reset link has been sent.
          Check your inbox and follow the link to set a new password.
        </div>
        <Button type="button" variant="secondary" className="w-full" onClick={onBack}>
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the email associated with your account and we'll send a link to reset your password.
      </p>
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send reset link'}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-muted-foreground hover:text-foreground cursor-pointer text-center"
      >
        Back to sign in
      </button>
    </form>
  )
}

function ResetPasswordForm({ accessToken }: { accessToken: string }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSubmitting(true)
    try {
      await completePasswordReset(accessToken, newPassword)
      setDone(true)
      // Clear the recovery hash so a refresh doesn't re-trigger this screen
      window.history.replaceState(null, '', window.location.pathname)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-md bg-success/10 text-success text-sm border border-success/20">
          Your password has been updated. You can now sign in with your new password.
        </div>
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={() => window.location.reload()}
        >
          Go to sign in
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
      <Input
        label="New Password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
      />
      <Input
        label="Confirm New Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
        {submitting ? 'Updating…' : 'Set new password'}
      </Button>
    </form>
  )
}

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@erp.test')
  const [password, setPassword] = useState('Password123!')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null)

  useEffect(() => {
    setRecoveryToken(getRecoveryTokenFromUrl())
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  const heading = recoveryToken
    ? 'Set a new password'
    : mode === 'forgot'
      ? 'Reset your password'
      : 'Sign in'
  const subheading = recoveryToken
    ? 'Choose a new password to finish resetting your account.'
    : mode === 'forgot'
      ? "We'll email you a link to get back in."
      : 'Sign in to the Enterprise ERP'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-[var(--radius-lg)] shadow-xl p-7">
        <div className="mb-7">
          <h1 className="text-2xl font-semibold text-foreground">{heading}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subheading}</p>
        </div>

        {recoveryToken ? (
          <ResetPasswordForm accessToken={recoveryToken} />
        ) : mode === 'forgot' ? (
          <ForgotPasswordForm onBack={() => setMode('login')} />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="w-full text-sm text-primary hover:underline cursor-pointer text-center"
            >
              Forgot password?
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
