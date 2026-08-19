import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'
import { updateProfile, changePassword } from '../api/profile'
import Button from '../components/ui/Button'
import Input, { Select } from '../components/ui/Input'
import Tabs from '../components/ui/Tabs'
import Badge from '../components/ui/Badge'
import { formatRoleLabel } from '../lib/user'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '')

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
        {title}
      </h4>
      {children}
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')

  // Profile form state
  const [firstName, setFirstName] = useState(user?.employee?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.employee?.lastName ?? '')
  const [phone, setPhone] = useState((user?.employee as any)?.phone ?? '')
  const [address, setAddress] = useState((user?.employee as any)?.address ?? '')
  const [gender, setGender] = useState((user?.employee as any)?.gender ?? '')
  const [dateOfBirth, setDateOfBirth] = useState((user?.employee as any)?.dateOfBirth ?? '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // Security form state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.employee?.avatarUrl ?? null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  useEffect(() => {
    if (user?.employee) {
      setFirstName(user.employee.firstName ?? '')
      setLastName(user.employee.lastName ?? '')
      const emp = user.employee as any
      setPhone(emp.phone ?? '')
      setAddress(emp.address ?? '')
      setGender(emp.gender ?? '')
      setDateOfBirth(emp.dateOfBirth ?? '')
      setAvatarPreview(user.employee.avatarUrl ?? null)
    }
  }, [user])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError('')
    setProfileSuccess('')
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
      })
      setProfileSuccess('Profile updated successfully! Refresh to see changes.')
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess('')
    try {
      await changePassword(newPassword)
      setPasswordSuccess('Password changed successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview immediately
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setAvatarLoading(true)
    setAvatarError('')
    try {
      const token = localStorage.getItem('erp_access_token')
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await fetch(`${API_URL}/api/employees/me/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Upload failed')
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not upload avatar')
    } finally {
      setAvatarLoading(false)
    }
  }

  const displayName = `${firstName} ${lastName}`.trim() || user?.name || 'Unknown User'
  const initials = getInitials(displayName)

  const tabs = [
    { id: 'profile', label: 'Personal Information' },
    { id: 'security', label: 'Account & Security' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* ─── Profile Hero Header ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-[var(--radius-lg)] overflow-hidden">
        {/* Cover gradient */}
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/30" />

        <div className="px-6 pb-6">
          {/* Avatar, floating over cover */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full border-4 border-card shadow-lg overflow-hidden bg-muted">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/15 text-primary text-2xl font-bold">
                    {initials}
                  </div>
                )}
              </div>

              {/* Upload overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                {avatarLoading ? (
                  <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 3v12M3 9h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => void handleAvatarChange(e)}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Badge variant={
                user?.role === 'ADMIN' ? 'danger' :
                  user?.role === 'HR' ? 'purple' :
                    user?.role === 'MANAGER' ? 'info' : 'success'
              }>
                {user?.role ? formatRoleLabel(user.role) : 'Employee'}
              </Badge>
              {user?.isActive && <Badge variant="success">Active</Badge>}
            </div>
          </div>

          {/* Name & details */}
          <div>
            <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {user?.employee?.designation && (
              <p className="text-xs text-muted-foreground mt-0.5">{user.employee.designation}</p>
            )}
          </div>

          {avatarError && (
            <div className="mt-2 text-xs text-danger">{avatarError}</div>
          )}

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Employee Code</div>
              <div className="text-sm font-mono font-bold text-foreground mt-0.5">
                {(user?.employee as any)?.employeeCode ?? '—'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Department</div>
              <div className="text-sm font-bold text-foreground mt-0.5">
                {user?.department?.name ?? '—'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Joined</div>
              <div className="text-sm font-bold text-foreground mt-0.5">
                {(user?.employee as any)?.dateOfJoining
                  ? new Date((user?.employee as any).dateOfJoining).toLocaleDateString([], { month: 'short', year: 'numeric' })
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as any)} />

      {/* ─── TAB 1: PERSONAL INFORMATION ─────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
          <form onSubmit={(e) => void handleSaveProfile(e)} className="space-y-5">
            <FormSection title="Personal Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Select
                  label="Gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </Select>
              </div>

              <Input
                label="Date of Birth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Address</label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-border bg-background text-foreground text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                  placeholder="Your residential address…"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </FormSection>

            <FormSection title="Read-only Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Address</label>
                  <div className="px-3 py-2 bg-muted/50 rounded-md border border-border text-sm text-foreground">
                    {user?.email ?? '—'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
                  <div className="px-3 py-2 bg-muted/50 rounded-md border border-border text-sm text-foreground">
                    {user?.role ? formatRoleLabel(user.role) : '—'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
                  <div className="px-3 py-2 bg-muted/50 rounded-md border border-border text-sm text-foreground">
                    {user?.department?.name ?? '—'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Designation</label>
                  <div className="px-3 py-2 bg-muted/50 rounded-md border border-border text-sm text-foreground">
                    {user?.employee?.designation ?? '—'}
                  </div>
                </div>
              </div>
            </FormSection>

            {profileError && (
              <div className="p-3 rounded-md bg-danger/10 text-danger text-sm border border-danger/20">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="p-3 rounded-md bg-success/10 text-success text-sm border border-success/20">
                {profileSuccess}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" disabled={profileLoading}>
                {profileLoading ? 'Saving Changes…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ─── TAB 2: ACCOUNT & SECURITY ───────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {/* Change Password Card */}
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
            <h3 className="text-sm font-bold text-foreground mb-1">Change Password</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Update your password to keep your account secure. Minimum 6 characters.
            </p>

            <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-3 max-w-md">
              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password…"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Repeat new password…"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {passwordError && (
                <div className="p-2 rounded bg-danger/10 text-danger text-xs border border-danger/20">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-2 rounded bg-success/10 text-success text-xs border border-success/20">
                  {passwordSuccess}
                </div>
              )}

              <Button type="submit" variant="danger" disabled={passwordLoading}>
                {passwordLoading ? 'Updating Password…' : 'Update Password'}
              </Button>
            </form>
          </div>

          {/* Account Info Card */}
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
            <h3 className="text-sm font-bold text-foreground mb-4">Account Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Account Status', value: user?.isActive ? 'Active' : 'Inactive', className: user?.isActive ? 'text-success font-semibold' : 'text-danger' },
                { label: 'Role / Permission Level', value: user?.role ? formatRoleLabel(user.role) : '—' },
                { label: 'Email (Login ID)', value: user?.email ?? '—' },
                { label: 'Employee ID', value: (user?.employee as any)?.employeeCode ?? '—' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-md bg-muted/30 border border-border">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">{item.label}</div>
                  <div className={`text-sm font-medium text-foreground ${item.className ?? ''}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions Summary */}
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
            <h3 className="text-sm font-bold text-foreground mb-4">Role Permissions</h3>
            <div className="space-y-2 text-xs">
              {(user?.role === 'ADMIN' ? [
                'Full system access — all modules',
                'User management and role assignment',
                'Organization settings and configuration',
                'Audit logs and system health',
              ] : user?.role === 'HR' ? [
                'Manage employee records and onboarding',
                'Process payroll and leave approvals',
                'View attendance and workforce analytics',
                'Configure leave policies and benefits',
              ] : user?.role === 'MANAGER' ? [
                'View and manage team attendance',
                'Review and approve leave requests',
                'Create and assign projects & tasks',
                'View team performance analytics',
              ] : [
                'View personal attendance records',
                'Submit leave requests',
                'View personal payslip and balance',
                'Manage personal profile and settings',
              ]).map((perm, i) => (
                <div key={i} className="flex items-start gap-2 text-muted-foreground">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-success mt-0.5 shrink-0">
                    <path d="M2.5 7l3 3L11.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {perm}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
