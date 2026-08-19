import { apiFetch } from './client'

export interface ComputedSalaryItem {
  employeeId: string
  employeeCode: string
  name: string
  firstName: string
  lastName: string
  designation: string
  department: string
  departmentId: string | null
  employmentType: string
  avatarUrl: string | null
  basicSalary: number
  housingAllowance: number
  transportAllowance: number
  totalAllowance: number
  grossSalary: number
  taxDeduction: number
  pensionDeduction: number
  totalDeductions: number
  netSalary: number
}

export interface PayrollSummary {
  totalEmployees: number
  totalGrossPayroll: number
  totalNetPayroll: number
  totalTax: number
  totalDeductions: number
  averageSalary: number
  departments: Array<{
    departmentName: string
    employeeCount: number
    totalGross: number
    totalNet: number
  }>
  monthlyTrend: Array<{
    month: string
    grossSalary: number
    netSalary: number
    tax: number
    isCurrent: boolean
  }>
}

export interface PayslipData {
  payslipNumber: string
  payPeriod: string
  payDate: string
  employee: {
    id: string
    name: string
    employeeCode: string
    email: string
    designation: string
    department: string
    dateOfJoining: string | null
    employmentType: string
  }
  earnings: Array<{ description: string; amount: number }>
  deductions: Array<{ description: string; amount: number }>
  totals: {
    grossEarnings: number
    totalDeductions: number
    netPay: number
  }
}

export interface GeneratePayrollInput {
  scope: 'all' | 'department' | 'employee'
  departmentId?: string
  employeeId?: string
  month: number
  year: number
  bonusPercentage?: number
  deductionAdjustment?: number
  notes?: string
}

export interface PayrollBatchItem {
  employeeId: string
  employeeCode: string
  name: string
  designation: string
  department: string
  basicSalary: number
  allowance: number
  bonus: number
  grossSalary: number
  taxDeduction: number
  pensionDeduction: number
  otherDeductions: number
  totalDeductions: number
  netSalary: number
}

export interface PayrollBatchResult {
  batchId: string
  payPeriod: string
  scope: string
  targetName: string
  processedAt: string
  processedBy: string
  notes: string | null
  itemCount: number
  totalBasic: number
  totalAllowance: number
  totalBonus: number
  totalGross: number
  totalTax: number
  totalPension: number
  totalDeductions: number
  totalNet: number
  items: PayrollBatchItem[]
}

export interface PayrollListResponse {
  success: true
  items: ComputedSalaryItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function getPayrollSummary() {
  return apiFetch<{ success: true; summary: PayrollSummary }>(
    '/api/payroll/summary',
  )
}

export async function listPayrollEmployees(
  params: {
    search?: string
    departmentId?: string
    page?: number
    limit?: number
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<PayrollListResponse>(
    `/api/payroll/employees${query.size ? `?${query}` : ''}`,
  )
}

export async function getEmployeePayslip(employeeId?: string) {
  return apiFetch<{ success: true; payslip: PayslipData }>(
    `/api/payroll/payslip${employeeId ? `/${employeeId}` : ''}`,
  )
}

export async function generatePayroll(input: GeneratePayrollInput) {
  return apiFetch<{ success: true; message: string; batch: PayrollBatchResult }>(
    '/api/payroll/generate',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}
