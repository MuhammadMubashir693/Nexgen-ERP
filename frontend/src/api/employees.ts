import { apiFetch } from './client'

export type Role = 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE'
export type EmployeeStatus = 'active' | 'terminated' | 'resigned' | 'suspended'

export interface Employee {
  id: string
  userId: string
  employeeCode: string
  firstName: string
  lastName: string
  phone: string | null
  address: string | null
  designation: string | null
  gender: string | null
  dateOfBirth: string | null
  dateOfJoining: string | null
  employmentType: string
  status: EmployeeStatus
  basicSalary?: number
  manager: {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
    designation: string | null
  } | null
  user: {
    id: string
    name: string
    email: string
    role: Role
    isActive: boolean
    themeAccent: string | null
    department: { id: string; name: string; description?: string | null } | null
  }
}

interface EmployeeResponse { success: true; employee: Employee }
interface EmployeeListResponse {
  success: true
  employees: Employee[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface CreateEmployeeInput {
  email: string
  password: string
  name: string
  role: Role
  departmentId?: string | null
  employeeCode: string
  firstName: string
  lastName: string
  phone?: string | null
  address?: string | null
  designation?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  dateOfJoining?: string | null
  employmentType: string
  basicSalary: number
  managerId?: string | null
}

export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, 'password'>> & {
  status?: EmployeeStatus
}

export async function listEmployees(params: {
  search?: string
  departmentId?: string
  role?: Role
  status?: EmployeeStatus
  page?: number
  limit?: number
} = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<EmployeeListResponse>(`/api/employees${query.size ? `?${query}` : ''}`)
}

export async function getEmployee(id: string) {
  return apiFetch<EmployeeResponse>(`/api/employees/${id}`)
}

export async function createEmployee(input: CreateEmployeeInput) {
  return apiFetch<EmployeeResponse>('/api/employees', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput) {
  return apiFetch<EmployeeResponse>(`/api/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deactivateEmployee(id: string) {
  return apiFetch<{ success: true; message: string; employee: { id: string; status: string; isActive: boolean } }>(
    `/api/employees/${id}`,
    { method: 'DELETE' },
  )
}

export async function hardDeleteEmployee(id: string) {
  return apiFetch<{ success: true; message: string; employee: { id: string; deleted: boolean; authDeleted: boolean } }>(
    `/api/employees/${id}/hard`,
    { method: 'DELETE' },
  )
}
