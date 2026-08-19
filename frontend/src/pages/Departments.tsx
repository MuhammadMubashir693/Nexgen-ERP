import { useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'
import DataTable, { type Column } from '../components/ui/DataTable'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import { useAuth } from '../lib/auth'
import {
  createDepartment,
  deactivateDepartment,
  getDepartment,
  listDepartments,
  updateDepartment,
  type Department,
} from '../api/departments'
import { listEmployees, type Employee } from '../api/employees'

interface FormState {
  name: string
  description: string
  managerId: string
  isActive: boolean
}

const emptyForm: FormState = {
  name: '',
  description: '',
  managerId: '',
  isActive: true,
}

export default function Departments() {
  const { user } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(12)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Potential managers for dropdown
  const [eligibleManagers, setEligibleManagers] = useState<Employee[]>([])

  // Modal states
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [viewingDepartment, setViewingDepartment] = useState<Department | null>(null)
  const [viewingLoading, setViewingLoading] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const canWrite = user?.role === 'ADMIN' || user?.role === 'HR'
  const canDeactivate = user?.role === 'ADMIN'

  async function loadDepartments() {
    setLoading(true)
    setError('')
    try {
      const isActive =
        statusFilter === 'active'
          ? true
          : statusFilter === 'inactive'
            ? false
            : undefined

      const result = await listDepartments({
        search,
        isActive,
        page,
        limit,
      })
      setDepartments(result.departments)
      setTotal(result.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load departments')
    } finally {
      setLoading(false)
    }
  }

  async function loadEligibleManagers() {
    try {
      const [managersRes, hrRes, adminRes] = await Promise.all([
        listEmployees({ role: 'MANAGER', limit: 100 }),
        listEmployees({ role: 'HR', limit: 100 }),
        listEmployees({ role: 'ADMIN', limit: 100 }),
      ])
      const combined = [...managersRes.employees, ...hrRes.employees, ...adminRes.employees]
      const uniqueMap = new Map<string, Employee>()
      combined.forEach((emp) => uniqueMap.set(emp.id, emp))
      setEligibleManagers(Array.from(uniqueMap.values()))
    } catch {
      // Ignore errors loading managers silently
    }
  }

  useEffect(() => {
    void loadEligibleManagers()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDepartments()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search, statusFilter, page, limit])

  // Stat calculations
  const stats = useMemo(() => {
    const activeCount = departments.filter((d) => d.isActive).length
    const totalAssigned = departments.reduce((acc, d) => acc + (d.employeeCount || 0), 0)
    const avgSize = activeCount > 0 ? (totalAssigned / activeCount).toFixed(1) : '0'

    return {
      total: total,
      active: activeCount,
      totalAssigned,
      avgSize,
    }
  }, [departments, total])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(dept: Department) {
    setEditing(dept)
    setForm({
      name: dept.name,
      description: dept.description ?? '',
      managerId: dept.manager?.employeeId ?? dept.manager?.id ?? '',
      isActive: dept.isActive,
    })
    setFormOpen(true)
  }

  async function openView(dept: Department) {
    setViewingLoading(true)
    setViewingDepartment(dept)
    try {
      const res = await getDepartment(dept.id)
      setViewingDepartment(res.department)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not view department details')
    } finally {
      setViewingLoading(false)
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSaveDepartment(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updateDepartment(editing.id, {
          name: form.name,
          description: form.description || null,
          managerId: form.managerId || null,
          isActive: form.isActive,
        })
      } else {
        await createDepartment({
          name: form.name,
          description: form.description || null,
          managerId: form.managerId || null,
        })
      }
      setFormOpen(false)
      await loadDepartments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save department')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(dept: Department) {
    if (!window.confirm(`Are you sure you want to deactivate department "${dept.name}"?`)) return
    try {
      await deactivateDepartment(dept.id)
      await loadDepartments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not deactivate department')
    }
  }

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: 'Department Name',
      render: (row) => (
        <div>
          <span className="font-semibold text-foreground">{row.name}</span>
          {row.description && (
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'manager',
      header: 'Department Head / Manager',
      render: (row) =>
        row.manager ? (
          <div>
            <span className="font-medium text-foreground text-sm">
              {row.manager.firstName} {row.manager.lastName}
            </span>
            <p className="text-xs text-muted-foreground">
              {row.manager.designation ?? row.manager.role}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs italic">Unassigned</span>
        ),
    },
    {
      key: 'employeeCount',
      header: 'Staff Assigned',
      render: (row) => (
        <Badge variant={row.employeeCount > 0 ? 'info' : 'gray'}>
          {row.employeeCount} {row.employeeCount === 1 ? 'employee' : 'employees'}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            className="text-success text-sm font-medium hover:underline cursor-pointer"
            onClick={() => void openView(row)}
          >
            View
          </button>
          {canWrite && (
            <button
              className="text-primary text-sm font-medium hover:underline cursor-pointer"
              onClick={() => openEdit(row)}
            >
              Edit
            </button>
          )}
          {canDeactivate && row.isActive && (
            <button
              className="text-danger text-sm font-medium hover:underline cursor-pointer"
              onClick={() => void handleDeactivate(row)}
            >
              Deactivate
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Departments"
          value={String(stats.total)}
          iconColor="blue"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2.25 15.75h13.5M3.75 15.75V4.5a1.5 1.5 0 011.5-1.5h7.5a1.5 1.5 0 011.5 1.5v11.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          }
        />
        <StatCard
          label="Active Departments"
          value={String(stats.active)}
          iconColor="green"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M15 4.5L6.75 12.75 3 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <StatCard
          label="Total Staff Assigned"
          value={String(stats.totalAssigned)}
          iconColor="purple"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M12 15v-1.5a3 3 0 00-3-3H4.5a3 3 0 00-3 3V15M6.75 7.5a3 3 0 100-6 3 3 0 000 6zM16.5 15v-1.5a3 3 0 00-2.25-2.9M12.75 1.6a3 3 0 010 5.8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <StatCard
          label="Avg Department Size"
          value={`${stats.avgSize} staff`}
          iconColor="orange"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect
                x="2.25"
                y="3"
                width="13.5"
                height="12"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M6 7.5h6M6 10.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* Main Table Card */}
      <Card padding="none">
        <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Departments Directory</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} department{total === 1 ? '' : 's'} registered
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search department name or head"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-64"
            />
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
                setPage(1)
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            {canWrite && (
              <Button variant="primary" size="md" onClick={openCreate}>
                + Add Department
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Loading departments…
          </div>
        ) : (
          <DataTable columns={columns} data={departments} keyField="id" pageSize={limit} />
        )}

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Create / Edit Department Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveDepartment}
            className="bg-card border border-border rounded-[var(--radius-lg)] p-6 w-full max-w-lg shadow-xl"
          >
            <div className="flex items-center justify-between mb-5 border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editing ? 'Edit Department' : 'Create New Department'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editing
                    ? 'Update department details and manager assignment.'
                    : 'Add a new operational department to the system.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Department Name"
                placeholder="e.g. Engineering, Marketing, Finance"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of department responsibilities…"
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <Select
                label="Department Head / Manager"
                value={form.managerId}
                onChange={(e) => updateForm('managerId', e.target.value)}
              >
                <option value="">No Manager (Unassigned)</option>
                {eligibleManagers.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.designation || emp.user.role})
                  </option>
                ))}
              </Select>

              {editing && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveDept"
                    checked={form.isActive}
                    onChange={(e) => updateForm('isActive', e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="isActiveDept" className="text-sm font-medium text-foreground">
                    Active Department
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Department'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* View Department Details & Members Modal */}
      {viewingDepartment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingDepartment(null)
          }}
        >
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">{viewingDepartment.name}</h3>
                  <Badge variant={viewingDepartment.isActive ? 'success' : 'danger'}>
                    {viewingDepartment.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {viewingDepartment.description || 'No description provided.'}
                </p>
              </div>
              <button
                onClick={() => setViewingDepartment(null)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>

            {/* Department Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-accent/40 border border-border mb-6 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Department Head</span>
                <span className="font-semibold text-foreground">
                  {viewingDepartment.manager
                    ? `${viewingDepartment.manager.firstName} ${viewingDepartment.manager.lastName}`
                    : 'Unassigned'}
                </span>
                {viewingDepartment.manager?.email && (
                  <p className="text-xs text-muted-foreground">{viewingDepartment.manager.email}</p>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Total Members</span>
                <span className="font-semibold text-foreground">
                  {viewingDepartment.employeeCount} Assigned
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Created Date</span>
                <span className="font-semibold text-foreground">
                  {new Date(viewingDepartment.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Department Members Table */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Assigned Staff Members</h4>

              {viewingLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading department members…
                </div>
              ) : viewingDepartment.members && viewingDepartment.members.length > 0 ? (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
                      <tr>
                        <th className="p-3">Staff ID</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Designation</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {viewingDepartment.members.map((member) => (
                        <tr key={member.id} className="hover:bg-muted/30">
                          <td className="p-3 font-mono text-muted-foreground">
                            {member.employeeCode}
                          </td>
                          <td className="p-3 font-medium text-foreground">
                            {member.firstName} {member.lastName}
                            <p className="text-[11px] text-muted-foreground">{member.email}</p>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {member.designation || '—'}
                          </td>
                          <td className="p-3">
                            <Badge variant="gray">{member.role}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
                              {member.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 border border-dashed border-border rounded-lg text-center text-xs text-muted-foreground">
                  No staff currently assigned to this department.
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="secondary" onClick={() => setViewingDepartment(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
