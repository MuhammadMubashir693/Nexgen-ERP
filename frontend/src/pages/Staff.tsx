import { useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'
import DataTable, { type Column } from '../components/ui/DataTable'
import Card from '../components/ui/Card'
import Tabs from '../components/ui/Tabs'
import Departments from './Departments'
import { useAuth } from '../lib/auth'
import {
  createEmployee,
  deactivateEmployee,
  hardDeleteEmployee,
  listEmployees,
  updateEmployee,
  type Employee,
  type Role,
  type EmployeeStatus,
} from '../api/employees'
import { listDepartments, type Department as APIDepartment } from '../api/departments'

const roleLabels: Record<Role, string> = {
  ADMIN: 'Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
}

const statusVariant: Record<EmployeeStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
  active: 'success',
  suspended: 'warning',
  resigned: 'gray',
  terminated: 'danger',
}

interface FormState {
  email: string
  password: string
  name: string
  role: Role
  departmentId: string
  employeeCode: string
  firstName: string
  lastName: string
  phone: string
  address: string
  designation: string
  gender: string
  dateOfBirth: string
  dateOfJoining: string
  employmentType: string
  basicSalary: string
  managerId: string
}

const emptyForm: FormState = {
  email: '', password: '', name: '', role: 'EMPLOYEE', departmentId: '', employeeCode: '',
  firstName: '', lastName: '', phone: '', address: '', designation: '', gender: '',
  dateOfBirth: '', dateOfJoining: '', employmentType: 'full_time', basicSalary: '0', managerId: '',
}

function roleVariant(role: Role): 'purple' | 'info' | 'warning' | 'gray' {
  if (role === 'ADMIN') return 'purple'
  if (role === 'HR') return 'info'
  if (role === 'MANAGER') return 'warning'
  return 'gray'
}

export default function Staff() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'employees' | 'departments'>('employees')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(12)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EmployeeStatus | ''>('')
  const [role, setRole] = useState<Role | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [viewing, setViewing] = useState<Employee | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Direct departments list for dropdown
  const [departmentOptions, setDepartmentOptions] = useState<{ id: string; name: string }[]>([])

  const canWrite = user?.role === 'ADMIN' || user?.role === 'HR'
  const canHardDelete = user?.role === 'ADMIN'
  const canDeactivate = user?.role === 'ADMIN'

  async function loadEmployees() {
    setLoading(true)
    setError('')
    try {
      const result = await listEmployees({ search, role: role || undefined, status: status || undefined, page, limit })
      setEmployees(result.employees)
      setTotal(result.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load employees')
    } finally {
      setLoading(false)
    }
  }

  async function loadDepartmentsForSelect() {
    try {
      const result = await listDepartments({ isActive: true, limit: 100 })
      setDepartmentOptions(result.departments.map((d) => ({ id: d.id, name: d.name })))
    } catch {
      // Fallback to empty if load fails
    }
  }

  useEffect(() => {
    void loadDepartmentsForSelect()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadEmployees() }, 250)
    return () => window.clearTimeout(timer)
  }, [search, role, status, page, limit])

  const managers = useMemo(() => employees.filter((e) => e.user.role === 'MANAGER' || e.user.role === 'ADMIN'), [employees])
  const totalPages = Math.max(1, Math.ceil(total / limit))

  function openCreate() {
    void loadDepartmentsForSelect()
    setEditing(null)
    setForm({ ...emptyForm, role: 'EMPLOYEE' })
    setFormOpen(true)
  }

  function openEdit(employee: Employee) {
    void loadDepartmentsForSelect()
    setEditing(employee)
    setForm({
      email: employee.user.email,
      password: '',
      name: employee.user.name,
      role: employee.user.role,
      departmentId: employee.user.department?.id ?? '',
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone ?? '',
      address: employee.address ?? '',
      designation: employee.designation ?? '',
      gender: employee.gender ?? '',
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : '',
      dateOfJoining: employee.dateOfJoining ? employee.dateOfJoining.slice(0, 10) : '',
      employmentType: employee.employmentType,
      basicSalary: String(employee.basicSalary ?? 0),
      managerId: employee.manager?.id ?? '',
    })
    setFormOpen(true)
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function saveEmployee(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updateEmployee(editing.id, {
          email: form.email,
          name: form.name,
          role: form.role,
          departmentId: form.departmentId || null,
          employeeCode: form.employeeCode,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || null,
          address: form.address || null,
          designation: form.designation || null,
          gender: form.gender || null,
          dateOfBirth: form.dateOfBirth || null,
          dateOfJoining: form.dateOfJoining || null,
          employmentType: form.employmentType,
          basicSalary: Number(form.basicSalary || 0),
          managerId: form.managerId || null,
        })
      } else {
        if (!form.password) throw new Error('Password is required for a new employee')
        await createEmployee({
          email: form.email, password: form.password, name: form.name, role: form.role,
          departmentId: form.departmentId || null, employeeCode: form.employeeCode,
          firstName: form.firstName, lastName: form.lastName, phone: form.phone || null,
          address: form.address || null, designation: form.designation || null, gender: form.gender || null,
          dateOfBirth: form.dateOfBirth || null, dateOfJoining: form.dateOfJoining || null,
          employmentType: form.employmentType, basicSalary: Number(form.basicSalary || 0), managerId: form.managerId || null,
        })
      }
      setFormOpen(false)
      await loadEmployees()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save employee')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(employee: Employee) {
    if (!window.confirm(`Deactivate ${employee.firstName} ${employee.lastName}?`)) return
    try {
      await deactivateEmployee(employee.id)
      await loadEmployees()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not deactivate employee') }
  }

  async function hardDelete(employee: Employee) {
    const confirmation = window.prompt(`This permanently deletes ${employee.firstName} ${employee.lastName}. Type ${employee.employeeCode} to confirm.`)
    if (confirmation !== employee.employeeCode) return
    try {
      await hardDeleteEmployee(employee.id)
      await loadEmployees()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not permanently delete employee') }
  }

  const columns: Column<Employee>[] = [
    { key: 'employeeCode', header: 'Staff ID', render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.employeeCode}</span> },
    { key: 'firstName', header: 'First Name' },
    { key: 'lastName', header: 'Last Name' },
    { key: 'gender', header: 'Gender', render: (row) => <span className="text-muted-foreground capitalize">{row.gender ?? '—'}</span> },
    { key: 'phone', header: 'Phone Number', render: (row) => <span className="text-muted-foreground">{row.phone ?? '—'}</span> },
    { key: 'role', header: 'Role', render: (row) => <Badge variant={roleVariant(row.user.role)}>{roleLabels[row.user.role]}</Badge> },
    { key: 'designation', header: 'Designation', render: (row) => row.designation ?? '—' },
    { key: 'department', header: 'Department', render: (row) => row.user.department?.name ? <Badge variant="info">{row.user.department.name}</Badge> : '—' },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge> },
    {
      key: 'action', header: 'Action', render: (row) => (
        <div className="flex items-center gap-2">
          <button className="text-success text-sm font-medium hover:underline cursor-pointer" onClick={() => setViewing(row)}>View</button>
          {canWrite && <button className="text-primary text-sm font-medium hover:underline cursor-pointer" onClick={() => openEdit(row)}>Edit</button>}
          {canDeactivate && row.status === 'active' && <button className="text-warning text-sm font-medium hover:underline cursor-pointer" onClick={() => void deactivate(row)}>Deactivate</button>}
          {canHardDelete && <button className="text-danger text-sm font-medium hover:underline cursor-pointer" onClick={() => void hardDelete(row)}>Delete</button>}
        </div>
      )
    },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
      {/* Top Tab Navigation */}
      <div className="px-6 pt-3 bg-card border-b border-border shrink-0">
        <Tabs
          tabs={[
            { id: 'employees', label: 'All Employees' },
            { id: 'departments', label: 'Departments' },
          ]}
          active={activeTab}
          onChange={(id) => setActiveTab(id as 'employees' | 'departments')}
        />
      </div>

      {activeTab === 'departments' ? (
        <Departments />
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <Card padding="none">
            <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">All staff</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{total} total number of staff</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input placeholder="Enter search word" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-56" />
                <Select value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPage(1) }}>
                  <option value="">All roles</option><option value="ADMIN">Admin</option><option value="HR">HR</option><option value="MANAGER">Manager</option><option value="EMPLOYEE">Employee</option>
                </Select>
                <Select value={status} onChange={(e) => { setStatus(e.target.value as EmployeeStatus | ''); setPage(1) }}>
                  <option value="">All status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="resigned">Resigned</option><option value="terminated">Terminated</option>
                </Select>
                {canWrite && <Button variant="primary" size="md" onClick={openCreate}>+ Add new staff</Button>}
              </div>
            </div>
            {error && <div className="m-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}
            {loading ? <div className="p-12 text-center text-sm text-muted-foreground">Loading employees…</div> : <DataTable columns={columns} data={employees} keyField="id" pageSize={limit} />}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </Card>

          {formOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <form onSubmit={saveEmployee} className="bg-card border border-border rounded-[var(--radius-lg)] p-6 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <div><h3 className="text-lg font-semibold text-foreground">{editing ? 'Edit employee' : 'Add new staff'}</h3><p className="text-xs text-muted-foreground mt-1">{editing ? 'Update the employee record.' : 'Create the Supabase account and ERP employee record.'}</p></div>
                  <button type="button" onClick={() => setFormOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input label="First Name" value={form.firstName} onChange={(e) => updateForm('firstName', e.target.value)} required />
                  <Input label="Last Name" value={form.lastName} onChange={(e) => updateForm('lastName', e.target.value)} required />
                  <Input label="Full Name / Account Name" value={form.name} onChange={(e) => updateForm('name', e.target.value)} required />
                  <Input label="Email" type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} required />
                  {!editing && <Input label="Initial Password" type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} required />}
                  <Input label="Staff ID" value={form.employeeCode} onChange={(e) => updateForm('employeeCode', e.target.value)} required />
                  <Input label="Phone Number" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
                  <Input label="Designation" value={form.designation} onChange={(e) => updateForm('designation', e.target.value)} />
                  <Select label="Gender" value={form.gender} onChange={(e) => updateForm('gender', e.target.value)}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select>
                  <Select label="Role" value={form.role} onChange={(e) => updateForm('role', e.target.value as Role)} disabled={user?.role === 'HR'}><option value="EMPLOYEE">Employee</option><option value="MANAGER">Manager</option>{user?.role === 'ADMIN' && <><option value="HR">HR</option><option value="ADMIN">Admin</option></>}</Select>
                  <Select label="Employment Type" value={form.employmentType} onChange={(e) => updateForm('employmentType', e.target.value)}><option value="full_time">Full time</option><option value="part_time">Part time</option><option value="contract">Contract</option></Select>
                  <Input label="Basic Salary" type="number" min="0" value={form.basicSalary} onChange={(e) => updateForm('basicSalary', e.target.value)} />
                  <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e) => updateForm('dateOfBirth', e.target.value)} />
                  <Input label="Date of Joining" type="date" value={form.dateOfJoining} onChange={(e) => updateForm('dateOfJoining', e.target.value)} />
                  <Select label="Department" value={form.departmentId} onChange={(e) => updateForm('departmentId', e.target.value)}>
                    <option value="">No department</option>
                    {departmentOptions.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                  </Select>
                  <Select label="Manager" value={form.managerId} onChange={(e) => updateForm('managerId', e.target.value)}><option value="">No manager</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>)}</Select>
                  <div className="md:col-span-2"><Input label="Address" value={form.address} onChange={(e) => updateForm('address', e.target.value)} /></div>
                </div>
                <div className="flex justify-end gap-2 mt-6"><Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add staff'}</Button></div>
              </form>
            </div>
          )}

          {viewing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setViewing(null) }}>
              <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6 w-full max-w-2xl shadow-xl">
                <div className="flex items-center justify-between mb-5"><div><h3 className="text-lg font-semibold text-foreground">{viewing.firstName} {viewing.lastName}</h3><p className="text-xs text-muted-foreground">{viewing.employeeCode}</p></div><button onClick={() => setViewing(null)} className="text-muted-foreground hover:text-foreground">✕</button></div>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <Detail label="Email" value={viewing.user.email} /><Detail label="Phone" value={viewing.phone ?? '—'} /><Detail label="Designation" value={viewing.designation ?? '—'} /><Detail label="Role" value={roleLabels[viewing.user.role]} /><Detail label="Department" value={viewing.user.department?.name ?? '—'} /><Detail label="Manager" value={viewing.manager ? `${viewing.manager.firstName} ${viewing.manager.lastName}` : '—'} /><Detail label="Employment" value={viewing.employmentType} /><Detail label="Status" value={viewing.status} /><Detail label="Date joined" value={viewing.dateOfJoining ? new Date(viewing.dateOfJoining).toLocaleDateString() : '—'} />
                  {(user?.role === 'ADMIN' || user?.role === 'HR') && <Detail label="Basic salary" value={viewing.basicSalary != null ? String(viewing.basicSalary) : '—'} />}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground mb-1">{label}</p><p className="text-foreground">{value}</p></div>
}
