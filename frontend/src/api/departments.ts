import { apiFetch } from './client'

export interface DepartmentManager {
  id: string
  employeeId: string | null
  name: string
  email: string
  role: string
  isActive: boolean
  firstName: string
  lastName: string
  designation: string | null
  avatarUrl: string | null
}

export interface DepartmentMember {
  id: string
  userId: string
  name: string
  email: string
  role: string
  isActive: boolean
  employeeCode: string
  firstName: string
  lastName: string
  designation: string | null
  status: string
  phone: string | null
  avatarUrl: string | null
}

export interface Department {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  manager: DepartmentManager | null
  employeeCount: number
  members?: DepartmentMember[]
}

export interface DepartmentListResponse {
  success: true
  departments: Department[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateDepartmentInput {
  name: string
  description?: string | null
  managerId?: string | null
}

export interface UpdateDepartmentInput {
  name?: string
  description?: string | null
  managerId?: string | null
  isActive?: boolean
}

export async function listDepartments(
  params: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<DepartmentListResponse>(
    `/api/departments${query.size ? `?${query}` : ''}`,
  )
}

export async function getDepartment(id: string) {
  return apiFetch<{ success: true; department: Department }>(
    `/api/departments/${id}`,
  )
}

export async function createDepartment(input: CreateDepartmentInput) {
  return apiFetch<{ success: true; message: string; department: Department }>(
    '/api/departments',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput) {
  return apiFetch<{ success: true; message: string; department: Department }>(
    `/api/departments/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
}

export async function deactivateDepartment(id: string) {
  return apiFetch<{ success: true; message: string; department: Department }>(
    `/api/departments/${id}`,
    {
      method: 'DELETE',
    },
  )
}
