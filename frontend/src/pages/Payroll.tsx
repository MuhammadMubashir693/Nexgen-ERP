import { useEffect, useState } from 'react'
import StatCard from '../components/ui/StatCard'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'
import DataTable, { type Column } from '../components/ui/DataTable'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  generatePayroll,
  getEmployeePayslip,
  getPayrollSummary,
  listPayrollEmployees,
  type ComputedSalaryItem,
  type PayrollBatchResult,
  type PayrollSummary,
  type PayslipData,
} from '../api/payroll'
import { listDepartments, type Department } from '../api/departments'
import { listEmployees, type Employee } from '../api/employees'
import { useAuth } from '../lib/auth'

function formatCurrency(amount: number | string | undefined | null): string {
  if (amount == null) return '$0.00'
  const num = typeof amount === 'number' ? amount : Number(amount)
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const TABS = [
  { id: 'salary', label: 'Salary Breakdown' },
  { id: 'analytics', label: 'Monthly Trends' },
  { id: 'departments', label: 'Department Cost' },
  { id: 'batches', label: 'Generated Batches' },
  { id: 'tax', label: 'Tax & Policies' },
]

export default function Payroll() {
  const { user } = useAuth()
  const isHrOrAdmin = user?.role === 'ADMIN' || user?.role === 'HR'
  const [activeTab, setActiveTab] = useState('salary')

  // Data states
  const [summary, setSummary] = useState<PayrollSummary | null>(null)
  const [salaryItems, setSalaryItems] = useState<ComputedSalaryItem[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(12)

  // Payslip modal
  const [payslipModalOpen, setPayslipModalOpen] = useState(false)
  const [activePayslip, setActivePayslip] = useState<PayslipData | null>(null)
  const [loadingPayslip, setLoadingPayslip] = useState(false)

  // Generate Payroll Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    scope: 'all' as 'all' | 'department' | 'employee',
    departmentId: '',
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    bonusPercentage: 0,
    deductionAdjustment: 0,
    notes: '',
  })
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [generatedBatch, setGeneratedBatch] = useState<PayrollBatchResult | null>(null)
  const [batchHistory, setBatchHistory] = useState<PayrollBatchResult[]>([])

  async function loadSummary() {
    try {
      const res = await getPayrollSummary()
      setSummary(res.summary)
    } catch (err) {
      console.error('Could not load payroll summary:', err)
    }
  }

  async function loadReferenceData() {
    listDepartments({ isActive: true, limit: 100 })
      .then((res) => { if (res?.departments) setDepartments(res.departments) })
      .catch(console.error)

    listEmployees({ limit: 100 })
      .then((res) => { if (res?.employees) setEmployees(res.employees) })
      .catch(console.error)
  }

  async function loadSalaryList() {
    setLoading(true)
    try {
      const res = await listPayrollEmployees({
        search: search || undefined,
        departmentId: selectedDept || undefined,
        page,
        limit,
      })
      setSalaryItems(res.items)
    } catch (err) {
      console.error('Could not list salary items:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSummary()
    void loadReferenceData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSalaryList()
    }, 200)
    return () => clearTimeout(timer)
  }, [search, selectedDept, page, limit])

  async function viewPayslip(employeeId?: string) {
    setLoadingPayslip(true)
    setPayslipModalOpen(true)
    try {
      const res = await getEmployeePayslip(employeeId)
      setActivePayslip(res.payslip)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not generate payslip')
      setPayslipModalOpen(false)
    } finally {
      setLoadingPayslip(false)
    }
  }

  function openGenerateModal() {
    void loadReferenceData()
    setGenerateError('')
    setGenerateForm({
      scope: 'all',
      departmentId: departments[0]?.id || '',
      employeeId: employees[0]?.id || '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      bonusPercentage: 0,
      deductionAdjustment: 0,
      notes: '',
    })
    setGenerateModalOpen(true)
  }

  async function handleGeneratePayroll(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setGenerateError('')
    try {
      const res = await generatePayroll({
        scope: generateForm.scope,
        departmentId: generateForm.scope === 'department' ? generateForm.departmentId : undefined,
        employeeId: generateForm.scope === 'employee' ? generateForm.employeeId : undefined,
        month: Number(generateForm.month),
        year: Number(generateForm.year),
        bonusPercentage: Number(generateForm.bonusPercentage) || undefined,
        deductionAdjustment: Number(generateForm.deductionAdjustment) || undefined,
        notes: generateForm.notes || undefined,
      })
      setGeneratedBatch(res.batch)
      setBatchHistory((prev) => [res.batch, ...prev])
      setGenerateModalOpen(false)
      setActiveTab('batches')
      await loadSummary()
      await loadSalaryList()
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Could not generate payroll')
    } finally {
      setGenerating(false)
    }
  }

  const columns: Column<ComputedSalaryItem>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.avatarUrl ? (
            <img
              src={row.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              {(row.firstName?.[0] ?? 'E') + (row.lastName?.[0] ?? '')}
            </div>
          )}
          <div>
            <div className="font-semibold text-foreground text-sm">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.designation}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Emp Code',
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {row.employeeCode}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (row) => (
        <span className="text-xs text-muted-foreground font-medium">{row.department}</span>
      ),
    },
    {
      key: 'basicSalary',
      header: 'Basic Salary',
      render: (row) => <span className="font-mono text-xs">{formatCurrency(row.basicSalary)}</span>,
    },
    {
      key: 'allowance',
      header: 'Allowances',
      render: (row) => (
        <span className="font-mono text-xs text-success font-medium">
          +{formatCurrency(row.totalAllowance)}
        </span>
      ),
    },
    {
      key: 'grossSalary',
      header: 'Gross Salary',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatCurrency(row.grossSalary)}
        </span>
      ),
    },
    {
      key: 'deductions',
      header: 'Deductions (Tax+Pension)',
      render: (row) => (
        <span className="font-mono text-xs text-danger font-medium">
          -{formatCurrency(row.totalDeductions)}
        </span>
      ),
    },
    {
      key: 'netSalary',
      header: 'Net Salary',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
          {formatCurrency(row.netSalary)}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void viewPayslip(row.employeeId)}
          className="text-xs"
        >
          View Payslip
        </Button>
      ),
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* ─── KPI Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          iconColor="purple"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M2 7h14M6 11h2M11 11h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          value={summary ? formatCurrency(summary.totalGrossPayroll) : '$0.00'}
          label="Total Monthly Payroll"
          trend={`${summary?.totalEmployees ?? 0} Active Staff`}
          trendType="neutral"
        />
        <StatCard
          iconColor="green"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9 5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          value={summary ? formatCurrency(summary.totalNetPayroll) : '$0.00'}
          label="Total Net Take-Home"
          trend="Monthly Disbursement"
          trendType="up"
        />
        <StatCard
          iconColor="red"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 9h12M3 5h12M3 13h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          value={summary ? formatCurrency(summary.totalTax) : '$0.00'}
          label="Estimated Monthly Tax"
          trend="Statutory PAYE"
          trendType="neutral"
        />
        <StatCard
          iconColor="blue"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9 6v6M6 9h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          value={summary ? formatCurrency(summary.averageSalary) : '$0.00'}
          label="Average Staff Salary"
          trend="Across All Roles"
          trendType="neutral"
        />
      </div>

      {/* ─── Navigation Tabs & Action Bar ───────────────────────────────────── */}
      <Tabs
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        actions={
          <div className="flex items-center gap-2">
            {isHrOrAdmin && (
              <Button
                size="sm"
                variant="primary"
                onClick={openGenerateModal}
                className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-1.5">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Generate Payroll
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => void viewPayslip()}
            >
              My Payslip
            </Button>
          </div>
        }
      />

      {/* ─── TAB 1: SALARY BREAKDOWN ────────────────────────────────────────── */}
      {activeTab === 'salary' && (
        <div className="space-y-4">
          <Card padding="sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search staff by name, code, designation…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  prefix={
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9.5 9.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  }
                />
              </div>

              {departments.length > 0 && (
                <div className="w-48">
                  <Select
                    value={selectedDept}
                    onChange={(e) => {
                      setSelectedDept(e.target.value)
                      setPage(1)
                    }}
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setSelectedDept('')
                  setPage(1)
                }}
              >
                Reset
              </Button>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading salary data…</div>
            ) : (
              <DataTable
                columns={columns}
                data={salaryItems}
                pageSize={limit}
                keyField="employeeId"
                striped
              />
            )}
          </Card>
        </div>
      )}

      {/* ─── TAB 2: MONTHLY TRENDS ───────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Annual Payroll Cost Trend (12 Months)</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Comparison between Gross Payroll, Net Payouts, and Tax Remittances.
                </p>
              </div>
            </CardHeader>
            <div className="h-80 w-full pt-4">
              {summary?.monthlyTrend ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.monthlyTrend} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => formatCurrency(val)}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--foreground)',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="grossSalary" name="Gross Salary" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="netSalary" name="Net Pay" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tax" name="Income Tax" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Loading analytics chart…
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 3: DEPARTMENT DISTRIBUTION ─────────────────────────────────── */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary?.departments?.map((dept) => {
              const share =
                summary.totalGrossPayroll > 0
                  ? Math.round((dept.totalGross / summary.totalGrossPayroll) * 100)
                  : 0
              return (
                <Card key={dept.departmentName} className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-foreground">{dept.departmentName}</span>
                      <Badge variant="purple">{dept.employeeCount} Staff</Badge>
                    </div>
                    <div className="space-y-1.5 mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Total Gross:</span>
                        <span className="font-mono font-semibold text-foreground">{formatCurrency(dept.totalGross)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Net Take-Home:</span>
                        <span className="font-mono font-semibold text-success">{formatCurrency(dept.totalNet)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-4 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border flex justify-between">
                    <span>Share of Payroll</span>
                    <span className="font-semibold text-foreground">{share}%</span>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 4: GENERATED BATCHES ─────────────────────────────────────────── */}
      {activeTab === 'batches' && (
        <div className="space-y-6">
          {generatedBatch ? (
            <Card className="border border-primary/40 bg-gradient-to-r from-card via-card to-primary/5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Latest Generated Batch</Badge>
                    <span className="font-mono text-xs text-muted-foreground">{generatedBatch.batchId}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-1">
                    {generatedBatch.payPeriod} • {generatedBatch.targetName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Processed {new Date(generatedBatch.processedAt).toLocaleString()} for {generatedBatch.itemCount} employee(s)
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-1.5">
                    <path d="M3.5 4.5V1.5h7v3M3.5 10H2a1 1 0 01-1-1V6.5a1 1 0 011-1h10a1 1 0 011 1V9a1 1 0 01-1 1h-1.5M3.5 8h7v4.5h-7V8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Print Summary
                </Button>
              </div>

              {/* Batch Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                <div className="p-3 bg-muted/40 rounded border border-border/50">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Basic</div>
                  <div className="text-base font-bold font-mono text-foreground mt-0.5">
                    {formatCurrency(generatedBatch.totalBasic)}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded border border-border/50">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Gross</div>
                  <div className="text-base font-bold font-mono text-foreground mt-0.5">
                    {formatCurrency(generatedBatch.totalGross)}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded border border-border/50">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Tax & Deductions</div>
                  <div className="text-base font-bold font-mono text-danger mt-0.5">
                    -{formatCurrency(generatedBatch.totalDeductions)}
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Total Net Payout</div>
                  <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(generatedBatch.totalNet)}
                  </div>
                </div>
              </div>

              {/* Itemized Batch List */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground font-semibold uppercase">
                      <th className="py-2 px-2.5">Emp Code</th>
                      <th className="py-2 px-2.5">Staff Name</th>
                      <th className="py-2 px-2.5">Department</th>
                      <th className="py-2 px-2.5">Basic</th>
                      <th className="py-2 px-2.5">Allowances</th>
                      <th className="py-2 px-2.5">Bonus</th>
                      <th className="py-2 px-2.5">Gross</th>
                      <th className="py-2 px-2.5">Deductions</th>
                      <th className="py-2 px-2.5">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedBatch.items.map((item) => (
                      <tr key={item.employeeId} className="border-b border-border last:border-0 hover:bg-muted/30 font-mono">
                        <td className="py-2 px-2.5 text-muted-foreground">{item.employeeCode}</td>
                        <td className="py-2 px-2.5 font-sans font-semibold text-foreground">{item.name}</td>
                        <td className="py-2 px-2.5 font-sans text-muted-foreground">{item.department}</td>
                        <td className="py-2 px-2.5">{formatCurrency(item.basicSalary)}</td>
                        <td className="py-2 px-2.5 text-success">+{formatCurrency(item.allowance)}</td>
                        <td className="py-2 px-2.5 text-info">+{formatCurrency(item.bonus)}</td>
                        <td className="py-2 px-2.5 font-bold text-foreground">{formatCurrency(item.grossSalary)}</td>
                        <td className="py-2 px-2.5 text-danger">-{formatCurrency(item.totalDeductions)}</td>
                        <td className="py-2 px-2.5 font-bold text-primary">{formatCurrency(item.netSalary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
              <h3 className="text-base font-bold text-foreground mb-1">No Payroll Batch Generated Yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
                Generate a payroll batch for all staff, a department, or an individual employee to process salary payments and print summaries.
              </p>
              {isHrOrAdmin && (
                <Button variant="primary" onClick={openGenerateModal}>
                  + Generate First Payroll Batch
                </Button>
              )}
            </div>
          )}

          {batchHistory.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Previous Generated Batches</CardTitle>
              </CardHeader>
              <div className="divide-y divide-border">
                {batchHistory.slice(1).map((b) => (
                  <div key={b.batchId} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-bold text-sm text-foreground">{b.payPeriod} • {b.targetName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{b.batchId} • {b.itemCount} staff</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(b.totalNet)}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setGeneratedBatch(b)}>
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── TAB 5: TAX & POLICIES ───────────────────────────────────────────── */}
      {activeTab === 'tax' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>PAYE Income Tax Tiers</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-2.5 rounded bg-muted/40 border border-border/50">
                <span>Standard Tier (Gross &gt; $200,000)</span>
                <span className="font-bold text-danger">12%</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-muted/40 border border-border/50">
                <span>Mid Tier ($100,000 - $200,000)</span>
                <span className="font-bold text-warning">8%</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-muted/40 border border-border/50">
                <span>Base Tier ($50,000 - $100,000)</span>
                <span className="font-bold text-info">5%</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-muted/40 border border-border/50">
                <span>Entry Tier (&lt; $50,000)</span>
                <span className="font-bold text-success">2%</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Allowances & Statutory Benefits</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-2.5 rounded bg-muted/40 border border-border/50">
                <div>
                  <div className="font-semibold">Housing Allowance</div>
                  <div className="text-xs text-muted-foreground">Standard monthly subsidy (60% of allowance rate)</div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-muted/40 border border-border/50">
                <div>
                  <div className="font-semibold">Transport Allowance</div>
                  <div className="text-xs text-muted-foreground">Commute support (40% of allowance rate)</div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-muted/40 border border-border/50">
                <div>
                  <div className="font-semibold">Pension Fund Scheme</div>
                  <div className="text-xs text-muted-foreground">Mandatory employee statutory contribution</div>
                </div>
                <span className="font-bold text-foreground">5% Basic</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── MODAL: GENERATE PAYROLL BATCH ───────────────────────────────────── */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-[var(--radius-lg)] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Generate Payroll Batch</h3>
                <p className="text-xs text-muted-foreground">Process salaries for department, employee, or all staff</p>
              </div>
              <button
                onClick={() => setGenerateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {generateError && (
              <div className="p-2.5 rounded bg-danger/10 text-danger text-xs font-medium border border-danger/20">
                {generateError}
              </div>
            )}

            <form onSubmit={(e) => void handleGeneratePayroll(e)} className="space-y-3">
              <Select
                label="Payroll Scope *"
                value={generateForm.scope}
                onChange={(e) => setGenerateForm({ ...generateForm, scope: e.target.value as any })}
                required
              >
                <option value="all">All Active Staff</option>
                <option value="department">Specific Department</option>
                <option value="employee">Individual Employee</option>
              </Select>

              {generateForm.scope === 'department' && (
                <Select
                  label="Department *"
                  value={generateForm.departmentId}
                  onChange={(e) => setGenerateForm({ ...generateForm, departmentId: e.target.value })}
                  required
                >
                  <option value="">Select department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}

              {generateForm.scope === 'employee' && (
                <Select
                  label="Employee *"
                  value={generateForm.employeeId}
                  onChange={(e) => setGenerateForm({ ...generateForm, employeeId: e.target.value })}
                  required
                >
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </Select>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Pay Month *"
                  value={generateForm.month}
                  onChange={(e) => setGenerateForm({ ...generateForm, month: Number(e.target.value) })}
                  required
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December',
                  ].map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Pay Year *"
                  type="number"
                  min="2020"
                  max="2035"
                  value={generateForm.year}
                  onChange={(e) => setGenerateForm({ ...generateForm, year: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Bonus (%)"
                  type="number"
                  step="1"
                  min="0"
                  max="200"
                  placeholder="e.g. 10"
                  value={generateForm.bonusPercentage || ''}
                  onChange={(e) => setGenerateForm({ ...generateForm, bonusPercentage: Number(e.target.value) })}
                />
                <Input
                  label="Deduction Adj ($)"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="e.g. 50"
                  value={generateForm.deductionAdjustment || ''}
                  onChange={(e) => setGenerateForm({ ...generateForm, deductionAdjustment: Number(e.target.value) })}
                />
              </div>

              <Input
                label="Batch Remarks / Notes"
                placeholder="Optional notes for disbursement…"
                value={generateForm.notes}
                onChange={(e) => setGenerateForm({ ...generateForm, notes: e.target.value })}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setGenerateModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={generating}
                  className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
                >
                  {generating ? 'Processing Batch…' : 'Process & Generate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DIGITAL PAYSLIP VIEWER ──────────────────────────────────── */}
      {payslipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-[var(--radius-lg)] shadow-2xl max-w-xl w-full p-6 space-y-5 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Employee Payslip</h3>
                <p className="text-xs text-muted-foreground">
                  {activePayslip ? `${activePayslip.payPeriod} • ${activePayslip.payslipNumber}` : 'Loading…'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 4.5V1.5h7v3M3.5 10H2a1 1 0 01-1-1V6.5a1 1 0 011-1h10a1 1 0 011 1V9a1 1 0 01-1 1h-1.5M3.5 8h7v4.5h-7V8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={() => setPayslipModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-lg cursor-pointer px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {loadingPayslip || !activePayslip ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Generating payslip data…</div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 bg-muted/40 rounded-lg border border-border grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Employee Name</span>
                    <span className="font-bold text-foreground text-sm">{activePayslip.employee.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Employee Code</span>
                    <span className="font-mono font-bold text-foreground">{activePayslip.employee.employeeCode}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Designation</span>
                    <span className="font-medium text-foreground">{activePayslip.employee.designation}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Department</span>
                    <span className="font-medium text-foreground">{activePayslip.employee.department}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 border border-border rounded-lg p-3 bg-card">
                    <h4 className="text-xs font-bold text-success uppercase tracking-wider">Earnings</h4>
                    <div className="divide-y divide-border text-xs">
                      {activePayslip.earnings.map((e, idx) => (
                        <div key={idx} className="flex justify-between py-1.5">
                          <span className="text-muted-foreground">{e.description}</span>
                          <span className="font-mono font-semibold text-foreground">{formatCurrency(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border font-bold text-xs">
                      <span>Gross Earnings:</span>
                      <span className="font-mono text-success">{formatCurrency(activePayslip.totals.grossEarnings)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border border-border rounded-lg p-3 bg-card">
                    <h4 className="text-xs font-bold text-danger uppercase tracking-wider">Deductions</h4>
                    <div className="divide-y divide-border text-xs">
                      {activePayslip.deductions.map((d, idx) => (
                        <div key={idx} className="flex justify-between py-1.5">
                          <span className="text-muted-foreground">{d.description}</span>
                          <span className="font-mono font-semibold text-foreground">{formatCurrency(d.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border font-bold text-xs">
                      <span>Total Deductions:</span>
                      <span className="font-mono text-danger">{formatCurrency(activePayslip.totals.totalDeductions)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">Net Pay Amount</span>
                    <div className="text-2xl font-mono font-bold text-primary">
                      {formatCurrency(activePayslip.totals.netPay)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>Pay Date: <strong>{activePayslip.payDate}</strong></div>
                    <div>Status: <span className="text-success font-bold">Processed</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
