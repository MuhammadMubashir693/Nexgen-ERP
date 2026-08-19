import { apiFetch } from './client'

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  assignedToId: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  createdAt: string | null
  project: {
    id: string
    name: string
    status: string
  } | null
  assignedTo: {
    id: string
    name: string
    email: string
    role: string
    avatarUrl: string | null
    designation: string | null
  } | null
}

export interface TaskListResponse {
  success: true
  tasks: Task[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateTaskInput {
  projectId: string
  title: string
  description?: string | null
  assignedToId?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  assignedToId?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
}

export async function listTasks(
  params: {
    projectId?: string
    assignedToId?: string
    status?: TaskStatus | 'all'
    priority?: TaskPriority | 'all'
    search?: string
    page?: number
    limit?: number
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<TaskListResponse>(
    `/api/tasks${query.size ? `?${query}` : ''}`,
  )
}

export async function getTask(id: string) {
  return apiFetch<{ success: true; task: Task }>(`/api/tasks/${id}`)
}

export async function createTask(input: CreateTaskInput) {
  return apiFetch<{ success: true; message: string; task: Task }>(
    '/api/tasks',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  return apiFetch<{ success: true; message: string; task: Task }>(
    `/api/tasks/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  return apiFetch<{ success: true; message: string; task: Task }>(
    `/api/tasks/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  )
}

export async function deleteTask(id: string) {
  return apiFetch<{ success: true; message: string; id: string }>(
    `/api/tasks/${id}`,
    {
      method: 'DELETE',
    },
  )
}
