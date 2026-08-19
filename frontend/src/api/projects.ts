import { apiFetch } from './client'

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold'

export interface ProjectTaskItem {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null
  assignedTo: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  } | null
}

export interface Project {
  id: string
  name: string
  description: string | null
  customerId: string | null
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  createdAt: string | null
  customer: {
    id: string
    name: string
    email: string
  } | null
  createdBy: {
    id: string
    name: string
    email: string
    role: string
  } | null
  taskStats: {
    total: number
    done: number
    inProgress: number
    todo: number
    review: number
    progressPercent: number
  }
  tasks: ProjectTaskItem[]
}

export interface ProjectsStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  planningProjects: number
  totalTasks: number
  inProgressTasks: number
  doneTasks: number
  overdueTasks: number
  completionRate: number
}

export interface ProjectListResponse {
  success: true
  projects: Project[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateProjectInput {
  name: string
  description?: string | null
  customerId?: string | null
  status?: ProjectStatus
  startDate?: string | null
  endDate?: string | null
}

export interface UpdateProjectInput {
  name?: string
  description?: string | null
  customerId?: string | null
  status?: ProjectStatus
  startDate?: string | null
  endDate?: string | null
}

export async function listProjects(
  params: {
    status?: ProjectStatus | 'all'
    customerId?: string
    search?: string
    page?: number
    limit?: number
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<ProjectListResponse>(
    `/api/projects${query.size ? `?${query}` : ''}`,
  )
}

export async function getProject(id: string) {
  return apiFetch<{ success: true; project: Project }>(
    `/api/projects/${id}`,
  )
}

export async function getProjectsStats() {
  return apiFetch<{ success: true; stats: ProjectsStats }>(
    '/api/projects/stats',
  )
}

export async function createProject(input: CreateProjectInput) {
  return apiFetch<{ success: true; message: string; project: Project }>(
    '/api/projects',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  return apiFetch<{ success: true; message: string; project: Project }>(
    `/api/projects/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
}

export async function deleteProject(id: string) {
  return apiFetch<{ success: true; message: string; id: string }>(
    `/api/projects/${id}`,
    {
      method: 'DELETE',
    },
  )
}
