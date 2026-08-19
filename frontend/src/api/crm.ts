import { apiFetch } from './client'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost'
export type CustomerStatus = 'active' | 'inactive' | 'suspended'

export interface Lead {
  id: string
  firstName: string
  lastName: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: LeadStatus
  notes: string | null
  assignedToId: string | null
  convertedToCustomerId: string | null
  createdAt: string | null
  updatedAt: string | null
  assignedTo: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
    designation: string | null
  } | null
  convertedToCustomer: {
    id: string
    name: string
    email: string
  } | null
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  billingAddress: string | null
  shippingAddress: string | null
  status: CustomerStatus
  notes: string | null
  assignedToId: string | null
  createdAt: string | null
  updatedAt: string | null
  assignedTo: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  } | null
  projectsCount: number
  projects: Array<{
    id: string
    name: string
    status: string
  }>
  leads: Array<{
    id: string
    firstName: string
    lastName: string
    status: string
  }>
}

export interface CRMStats {
  totalLeads: number
  newLeads: number
  contactedLeads: number
  qualifiedLeads: number
  wonLeads: number
  lostLeads: number
  totalCustomers: number
  activeCustomers: number
  conversionRate: number
}

export interface LeadListResponse {
  success: true
  leads: Lead[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CustomerListResponse {
  success: true
  customers: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateLeadInput {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  company?: string | null
  status?: LeadStatus
  assignedToId?: string | null
  notes?: string | null
}

export interface UpdateLeadInput {
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  company?: string | null
  status?: LeadStatus
  assignedToId?: string | null
  notes?: string | null
}

export interface CreateCustomerInput {
  name: string
  email: string
  phone?: string | null
  billingAddress?: string | null
  shippingAddress?: string | null
  status?: CustomerStatus
  assignedToId?: string | null
  notes?: string | null
}

export interface UpdateCustomerInput {
  name?: string
  email?: string
  phone?: string | null
  billingAddress?: string | null
  shippingAddress?: string | null
  status?: CustomerStatus
  assignedToId?: string | null
  notes?: string | null
}

export async function getCRMStats() {
  return apiFetch<{ success: true; stats: CRMStats }>('/api/crm/stats')
}

export async function listLeads(
  params: {
    status?: LeadStatus | 'all'
    assignedToId?: string
    search?: string
    page?: number
    limit?: number
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<LeadListResponse>(`/api/crm/leads${query.size ? `?${query}` : ''}`)
}

export async function createLead(input: CreateLeadInput) {
  return apiFetch<{ success: true; message: string; lead: Lead }>('/api/crm/leads', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateLead(id: string, input: UpdateLeadInput) {
  return apiFetch<{ success: true; message: string; lead: Lead }>(`/api/crm/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  return apiFetch<{ success: true; message: string; lead: Lead }>(`/api/crm/leads/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function convertLeadToCustomer(id: string) {
  return apiFetch<{ success: true; message: string; customer: Customer }>(`/api/crm/leads/${id}/convert`, {
    method: 'POST',
  })
}

export async function deleteLead(id: string) {
  return apiFetch<{ success: true; message: string; id: string }>(`/api/crm/leads/${id}`, {
    method: 'DELETE',
  })
}

export async function listCustomers(
  params: {
    status?: CustomerStatus | 'all'
    assignedToId?: string
    search?: string
    page?: number
    limit?: number
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<CustomerListResponse>(`/api/crm/customers${query.size ? `?${query}` : ''}`)
}

export async function createCustomer(input: CreateCustomerInput) {
  return apiFetch<{ success: true; message: string; customer: Customer }>('/api/crm/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  return apiFetch<{ success: true; message: string; customer: Customer }>(`/api/crm/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteCustomer(id: string) {
  return apiFetch<{ success: true; message: string; id: string }>(`/api/crm/customers/${id}`, {
    method: 'DELETE',
  })
}
