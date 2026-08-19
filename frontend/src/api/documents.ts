import { apiFetch } from './client'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '')

export type DocumentCategory =
  | 'general'
  | 'policy'
  | 'employee'
  | 'project'
  | 'customer'
  | 'contract'

export interface Document {
  id: string
  fileName: string
  fileUrl: string
  downloadUrl: string | null
  mimeType: string | null
  fileSize: number
  relatedType: DocumentCategory
  relatedId: string | null
  uploadedAt: string | null
  owner: {
    id: string
    name: string
    email: string
    role: string
    avatarUrl: string | null
  } | null
}

export interface DocumentStats {
  totalDocuments: number
  totalSizeBytes: number
  categories: Array<{
    category: string
    count: number
    sizeBytes: number
  }>
  fileTypes: Array<{
    type: string
    count: number
    sizeBytes: number
  }>
}

export interface DocumentListResponse {
  success: true
  documents: Document[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function getDocumentStats() {
  return apiFetch<{ success: true; stats: DocumentStats }>('/api/documents/stats')
}

export async function listDocuments(
  params: {
    relatedType?: string
    relatedId?: string
    ownerId?: string
    search?: string
    page?: number
    limit?: number
  } = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return apiFetch<DocumentListResponse>(`/api/documents${query.size ? `?${query}` : ''}`)
}

export async function getDocumentDownloadUrl(id: string) {
  return apiFetch<{ success: true; fileName: string; mimeType: string; downloadUrl: string }>(
    `/api/documents/${id}/download`,
  )
}

export async function uploadDocument(
  file: File,
  metadata: {
    fileName?: string
    relatedType?: DocumentCategory
    relatedId?: string
  } = {},
) {
  const token = localStorage.getItem('erp_access_token')
  const formData = new FormData()
  formData.append('file', file)
  if (metadata.fileName) formData.append('fileName', metadata.fileName)
  if (metadata.relatedType) formData.append('relatedType', metadata.relatedType)
  if (metadata.relatedId) formData.append('relatedId', metadata.relatedId)

  const res = await fetch(`${API_URL}/api/documents/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Upload failed')
  return data as { success: true; message: string; document: Document }
}

export async function updateDocument(
  id: string,
  input: { fileName?: string; relatedType?: string | null; relatedId?: string | null },
) {
  return apiFetch<{ success: true; message: string; document: Document }>(
    `/api/documents/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  )
}

export async function deleteDocument(id: string) {
  return apiFetch<{ success: true; message: string; id: string }>(
    `/api/documents/${id}`,
    { method: 'DELETE' },
  )
}
