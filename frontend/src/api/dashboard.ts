import { apiFetch } from './client'

export interface DashboardOverviewData {
  metrics: {
    staff: {
      total: number
      active: number
      departmentsCount: number
    }
    attendance: {
      present: number
      late: number
      onLeave: number
      absent: number
      rate: number
    }
    payroll: {
      totalGross: number
      totalNet: number
      avgSalary: number
    }
    projects: {
      total: number
      active: number
      completed: number
      totalTasks: number
      inProgressTasks: number
      doneTasks: number
      completionRate: number
    }
    crm: {
      totalLeads: number
      wonLeads: number
      totalCustomers: number
      activeCustomers: number
      conversionRate: number
    }
  }
  departments: Array<{
    id: string
    name: string
    staffCount: number
  }>
  weeklyAttendance: Array<{
    day: string
    present: number
    leave: number
    absent: number
  }>
  activityStream: Array<{
    id: string
    action: string
    entityType: string
    entityId: string | null
    timestamp: string
    userName: string
    userRole: string
    avatarUrl: string | null
  }>
}

export async function getDashboardOverview() {
  return apiFetch<{ success: true; data: DashboardOverviewData }>('/api/dashboard/overview')
}
