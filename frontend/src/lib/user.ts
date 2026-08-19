import type { Role } from '../api/employees'

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  HR: 'HR Manager',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
}

export function formatRoleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
