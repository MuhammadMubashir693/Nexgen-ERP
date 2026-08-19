import { useCallback, useEffect, useRef, useState } from 'react'
import StatCard from '../components/ui/StatCard'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'
import Tabs from '../components/ui/Tabs'
import {
  deleteDocument,
  getDocumentDownloadUrl,
  getDocumentStats,
  listDocuments,
  updateDocument,
  uploadDocument,
  type Document,
  type DocumentCategory,
  type DocumentStats,
} from '../api/documents'
import { listProjects } from '../api/projects'
import { listCustomers } from '../api/crm'
import { useAuth } from '../lib/auth'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    general: 'General',
    policy: 'Company Policy',
    employee: 'Employee Record',
    project: 'Project File',
    customer: 'Customer Contract',
    contract: 'Contract',
  }
  return labels[cat] ?? cat
}

function categoryVariant(cat: string): 'info' | 'success' | 'warning' | 'purple' | 'gray' | 'orange' {
  const map: Record<string, any> = {
    general: 'gray',
    policy: 'info',
    employee: 'success',
    project: 'purple',
    customer: 'warning',
    contract: 'orange',
  }
  return map[cat] ?? 'gray'
}

function getMimeIcon(mimeType: string | null): React.ReactNode {
  const m = mimeType ?? ''
  if (m.includes('pdf')) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-red-500">
        <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 8h14M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <text x="14" y="24" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold">PDF</text>
      </svg>
    )
  }
  if (m.includes('image')) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-emerald-500">
        <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 18l6-6 5 5 3-3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv')) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-green-600">
        <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 10h12M8 14h12M8 18h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (m.includes('word') || m.includes('document')) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-blue-500">
        <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 9h12M8 13h12M8 17h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  // default file
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-muted-foreground">
      <path d="M6 2h10l7 7v17a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 2v7h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const CATEGORY_FOLDERS: { id: DocumentCategory | 'all'; label: string; icon: string; color: string }[] = [
  { id: 'all', label: 'All Files', icon: '📁', color: 'text-muted-foreground' },
  { id: 'policy', label: 'Company Policies', icon: '📋', color: 'text-info' },
  { id: 'employee', label: 'Employee Records', icon: '👤', color: 'text-success' },
  { id: 'project', label: 'Project Files', icon: '🚀', color: 'text-purple-500' },
  { id: 'customer', label: 'Customer Contracts', icon: '🤝', color: 'text-warning' },
  { id: 'contract', label: 'Legal Contracts', icon: '📜', color: 'text-orange-500' },
  { id: 'general', label: 'General Documents', icon: '🗂️', color: 'text-muted-foreground' },
]

// ─── Upload Modal Component ──────────────────────────────────────────────────

function UploadModal({
  open,
  onClose,
  onUploaded,
  projects,
  customers,
}: {
  open: boolean
  onClose: () => void
  onUploaded: () => void
  projects: Array<{ id: string; name: string }>
  customers: Array<{ id: string; name: string }>
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    fileName: '',
    relatedType: 'general' as DocumentCategory,
    relatedId: '',
  })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      setFile(dropped)
      setForm((f) => ({ ...f, fileName: dropped.name }))
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setForm((prev) => ({ ...prev, fileName: f.name }))
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please select a file to upload'); return }
    setUploading(true)
    setError('')
    setProgress(10)

    // Fake progress ticks while uploading
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 90))
    }, 300)

    try {
      await uploadDocument(file, {
        fileName: form.fileName || file.name,
        relatedType: form.relatedType,
        relatedId:
          (form.relatedType === 'project' || form.relatedType === 'customer') && form.relatedId
            ? form.relatedId
            : undefined,
      })
      setProgress(100)
      setTimeout(() => {
        onUploaded()
        onClose()
        setFile(null)
        setProgress(0)
      }, 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      clearInterval(progressInterval)
      setUploading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-[var(--radius-lg)] shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">Upload Document</h3>
            <p className="text-xs text-muted-foreground">Files are stored securely in private storage</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer text-xl">✕</button>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-danger/10 text-danger text-xs border border-danger/20 font-medium">{error}</div>
        )}

        {/* Drop zone */}
        <div
          ref={dropRef}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

          {file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center">{getMimeIcon(file.type)}</div>
              <div className="text-sm font-semibold text-foreground truncate max-w-[200px]">{file.name}</div>
              <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="text-[11px] text-danger hover:underline font-medium cursor-pointer mt-1"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 3v18M8 11l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 24v2a2 2 0 002 2h20a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="text-sm font-semibold">Drag & drop or click to select</div>
              <div className="text-xs">PDF, Word, Excel, Images, up to 25 MB</div>
            </div>
          )}
        </div>

        {/* Upload progress */}
        {uploading && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Uploading to private storage…</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <form onSubmit={(e) => void handleUpload(e)} className="space-y-3">
          <Input
            label="File Name / Title"
            placeholder="Auto-filled from file name"
            value={form.fileName}
            onChange={(e) => setForm({ ...form, fileName: e.target.value })}
          />

          <Select
            label="Category"
            value={form.relatedType}
            onChange={(e) => setForm({ ...form, relatedType: e.target.value as DocumentCategory, relatedId: '' })}
          >
            <option value="general">General</option>
            <option value="policy">Company Policy</option>
            <option value="employee">Employee Record</option>
            <option value="project">Project File</option>
            <option value="customer">Customer Contract</option>
            <option value="contract">Legal Contract</option>
          </Select>

          {form.relatedType === 'project' && (
            <Select
              label="Link to Project"
              value={form.relatedId}
              onChange={(e) => setForm({ ...form, relatedId: e.target.value })}
            >
              <option value="">No specific project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          )}

          {form.relatedType === 'customer' && (
            <Select
              label="Link to Customer"
              value={form.relatedId}
              onChange={(e) => setForm({ ...form, relatedId: e.target.value })}
            >
              <option value="">No specific customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={uploading}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!file || uploading}>
              {uploading ? 'Uploading…' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Document Detail / Preview Modal ────────────────────────────────────────

function DocumentDetailModal({
  document,
  onClose,
  onDelete,
}: {
  document: Document
  onClose: () => void
  onDelete: () => void
}) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(document.downloadUrl)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function fetchSignedUrl() {
    if (downloadUrl) return
    setLoadingUrl(true)
    try {
      const res = await getDocumentDownloadUrl(document.id)
      setDownloadUrl(res.downloadUrl)
    } catch {
      // fail silently
    } finally {
      setLoadingUrl(false)
    }
  }

  useEffect(() => {
    void fetchSignedUrl()
  }, [])

  async function handleDelete() {
    if (!window.confirm(`Permanently delete "${document.fileName}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteDocument(document.id)
      onDelete()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const isImage = document.mimeType?.includes('image')
  const isPdf = document.mimeType?.includes('pdf')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-[var(--radius-lg)] shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {getMimeIcon(document.mimeType)}
            <div className="min-w-0">
              <h3 className="font-bold text-foreground text-sm truncate">{document.fileName}</h3>
              <p className="text-xs text-muted-foreground">
                {formatBytes(document.fileSize)} • {formatDate(document.uploadedAt)} • {categoryLabel(document.relatedType)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer text-xl ml-4 shrink-0">✕</button>
        </div>

        {/* Preview area */}
        <div className="flex-1 min-h-0 overflow-auto p-5">
          {(isImage || isPdf) && downloadUrl ? (
            <div className="w-full rounded-lg overflow-hidden border border-border bg-muted/20">
              {isImage ? (
                <img src={downloadUrl} alt={document.fileName} className="w-full object-contain max-h-96" />
              ) : (
                <iframe src={downloadUrl} title={document.fileName} className="w-full h-96 border-0" />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4">{getMimeIcon(document.mimeType)}</div>
              <p className="text-sm font-semibold text-foreground mb-1">{document.fileName}</p>
              <p className="text-xs text-muted-foreground mb-4">
                Preview not available for this file type. Download to open.
              </p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 mt-5 text-xs">
            <div className="bg-muted/40 rounded p-3 border border-border/50">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">File Size</div>
              <div className="font-mono font-semibold text-foreground">{formatBytes(document.fileSize)}</div>
            </div>
            <div className="bg-muted/40 rounded p-3 border border-border/50">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Category</div>
              <Badge variant={categoryVariant(document.relatedType)}>{categoryLabel(document.relatedType)}</Badge>
            </div>
            <div className="bg-muted/40 rounded p-3 border border-border/50">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Uploaded By</div>
              <div className="font-semibold text-foreground">{document.owner?.name ?? '—'}</div>
            </div>
            <div className="bg-muted/40 rounded p-3 border border-border/50">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Upload Date</div>
              <div className="font-mono text-foreground">{formatDate(document.uploadedAt)}</div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-border shrink-0">
          <Button
            variant="danger"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete File'}
          </Button>

          <div className="flex items-center gap-2">
            {loadingUrl ? (
              <span className="text-xs text-muted-foreground">Generating secure link…</span>
            ) : downloadUrl ? (
              <>
                {(isImage || isPdf) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(downloadUrl, '_blank')}
                  >
                    Open Preview
                  </Button>
                )}
                <a
                  href={downloadUrl}
                  download={document.fileName}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-[var(--radius)] bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v8M4 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 11.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Download
                </a>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={fetchSignedUrl}>
                Generate Download Link
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Documents Page ─────────────────────────────────────────────────────

export default function Documents() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'explorer' | 'folders' | 'analytics'>('explorer')
  const [stats, setStats] = useState<DocumentStats | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [selectedFolder, setSelectedFolder] = useState<string>('all')

  // Modals
  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      getDocumentStats()
        .then((res) => { if (res?.stats) setStats(res.stats) })
        .catch(console.error)

      const params: Record<string, string> = { limit: '100' }
      if (search) params.search = search
      if (categoryFilter && categoryFilter !== 'all') params.relatedType = categoryFilter

      listDocuments(params)
        .then((res) => { if (res?.documents) setDocuments(res.documents) })
        .catch(console.error)
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    listProjects({ limit: 100 })
      .then((res) => {
        if (res?.projects) {
          setProjects(res.projects.map((p) => ({ id: p.id, name: p.name })))
        }
      })
      .catch(console.error)

    listCustomers({ limit: 100 })
      .then((res) => {
        if (res?.customers) {
          setCustomers(res.customers.map((c) => ({ id: c.id, name: c.name })))
        }
      })
      .catch(console.error)
  }, [])

  // Folder-filtered docs
  const folderDocs = selectedFolder === 'all'
    ? documents
    : documents.filter((d) => d.relatedType === selectedFolder)

  const tabsConfig = [
    { id: 'explorer', label: 'Document Explorer' },
    { id: 'folders', label: 'Folder View' },
    { id: 'analytics', label: 'Storage Analytics' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* ─── KPI Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          iconColor="blue"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 2h6l5 5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10 2v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          value={String(stats?.totalDocuments ?? 0)}
          label="Total Documents"
          trend="Across all categories"
          trendType="neutral"
        />
        <StatCard
          iconColor="purple"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 3h12a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" />
              <path d="M2 6h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          value={stats ? formatBytes(stats.totalSizeBytes) : '0 B'}
          label="Total Storage Used"
          trend="Private Supabase bucket"
          trendType="neutral"
        />
        <StatCard
          iconColor="green"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M2 7h14M6 11h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          value={String(stats?.categories?.find((c) => c.category === 'policy')?.count ?? 0)}
          label="Company Policies"
          trend={`${stats?.categories?.find((c) => c.category === 'contract')?.count ?? 0} contracts`}
          trendType="neutral"
        />
        <StatCard
          iconColor="orange"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L3 6v10h12V6L9 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M6 16V9h6v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          value={String(stats?.categories?.find((c) => c.category === 'project')?.count ?? 0)}
          label="Project Files"
          trend={`${stats?.fileTypes?.find((t) => t.type === 'pdf')?.count ?? 0} PDFs`}
          trendType="neutral"
        />
      </div>

      {/* ─── Tabs & Actions ─────────────────────────────────────────────────── */}
      <Tabs
        tabs={tabsConfig}
        active={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        actions={
          <Button size="sm" variant="primary" onClick={() => setUploadOpen(true)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mr-1.5">
              <path d="M6 1v8M2 5l4-4 4 4M1 10.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Upload Document
          </Button>
        }
      />

      {/* ─── TAB 1: DOCUMENT EXPLORER ──────────────────────────────────────── */}
      {activeTab === 'explorer' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <Card padding="sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search documents by name or type…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  prefix={
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9.5 9.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  }
                />
              </div>
              <div className="w-44">
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">All Categories</option>
                  <option value="general">General</option>
                  <option value="policy">Company Policy</option>
                  <option value="employee">Employee Record</option>
                  <option value="project">Project File</option>
                  <option value="customer">Customer Contract</option>
                  <option value="contract">Legal Contract</option>
                </Select>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded p-1">
                <button
                  className={`p-1.5 rounded text-xs cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </button>
                <button
                  className={`p-1.5 rounded text-xs cursor-pointer transition-colors ${viewMode === 'table' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('table')}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 4h12M1 8h12M1 12h12M1 1v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </Card>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading documents…</div>
          ) : documents.length === 0 ? (
            <div className="py-16 border-2 border-dashed border-border rounded-xl text-center">
              <div className="text-3xl mb-3">📂</div>
              <p className="text-sm font-semibold text-foreground mb-1">No documents yet</p>
              <p className="text-xs text-muted-foreground mb-4">Upload your first document to get started</p>
              <Button variant="primary" onClick={() => setUploadOpen(true)}>Upload Document</Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-card border border-border rounded-[var(--radius-lg)] p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all cursor-pointer hover:border-primary/40 group"
                  onClick={() => setPreviewDoc(doc)}
                >
                  <div className="w-12 h-12 flex items-center justify-center">{getMimeIcon(doc.mimeType)}</div>
                  <div className="w-full text-center">
                    <p className="text-xs font-semibold text-foreground truncate w-full leading-tight">
                      {doc.fileName}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(doc.fileSize)}</p>
                  </div>
                  <Badge variant={categoryVariant(doc.relatedType)} className="text-[9px] px-1.5 py-0.5">
                    {categoryLabel(doc.relatedType)}
                  </Badge>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-full">
                    <button
                      className="flex-1 text-[10px] py-1 rounded bg-primary/10 text-primary font-semibold hover:bg-primary/20 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc) }}
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card padding="none" className="overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3">File</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Uploaded By</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <span className="shrink-0">{getMimeIcon(doc.mimeType)}</span>
                          <span className="font-medium text-foreground text-sm truncate max-w-[200px]">
                            {doc.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={categoryVariant(doc.relatedType)}>{categoryLabel(doc.relatedType)}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground">
                        {formatBytes(doc.fileSize)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        {doc.owner?.name ?? '—'}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="text-xs text-primary hover:underline font-medium cursor-pointer"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ─── TAB 2: FOLDER VIEW ────────────────────────────────────────────── */}
      {activeTab === 'folders' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Folder Sidebar */}
          <div className="lg:col-span-1 space-y-1.5">
            {CATEGORY_FOLDERS.map((folder) => {
              const count = folder.id === 'all'
                ? documents.length
                : documents.filter((d) => d.relatedType === folder.id).length
              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                    selectedFolder === folder.id
                      ? 'bg-primary/10 text-primary font-semibold border border-primary/30'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                  }`}
                >
                  <span className="text-base">{folder.icon}</span>
                  <span className="flex-1 text-left">{folder.label}</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Folder Content */}
          <div className="lg:col-span-3">
            {folderDocs.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-border rounded-xl">
                <div className="text-3xl mb-2">
                  {CATEGORY_FOLDERS.find((f) => f.id === selectedFolder)?.icon ?? '📂'}
                </div>
                <p className="text-sm text-muted-foreground">No documents in this folder</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setUploadOpen(true)}>
                  Upload here
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {folderDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-card border border-border rounded-[var(--radius-lg)] p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all cursor-pointer hover:border-primary/40"
                    onClick={() => setPreviewDoc(doc)}
                  >
                    <div className="w-10 h-10 flex items-center justify-center">
                      {getMimeIcon(doc.mimeType)}
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate w-full text-center leading-tight">
                      {doc.fileName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(doc.fileSize)} • {formatDate(doc.uploadedAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: STORAGE ANALYTICS ──────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Category */}
          <Card>
            <CardHeader>
              <CardTitle>Storage by Category</CardTitle>
            </CardHeader>
            <div className="space-y-3 pt-2">
              {stats?.categories?.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
              )}
              {stats?.categories?.map((cat) => {
                const pct = stats.totalSizeBytes > 0
                  ? Math.round((cat.sizeBytes / stats.totalSizeBytes) * 100)
                  : 0
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{categoryLabel(cat.category)}</span>
                      <span className="text-muted-foreground font-mono">
                        {cat.count} files • {formatBytes(cat.sizeBytes)}
                      </span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* By File Type */}
          <Card>
            <CardHeader>
              <CardTitle>Storage by File Type</CardTitle>
            </CardHeader>
            <div className="space-y-3 pt-2">
              {stats?.fileTypes?.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
              )}
              {stats?.fileTypes?.map((ft) => {
                const pct = stats.totalSizeBytes > 0
                  ? Math.round((ft.sizeBytes / stats.totalSizeBytes) * 100)
                  : 0
                const colors: Record<string, string> = {
                  pdf: 'bg-red-500',
                  image: 'bg-emerald-500',
                  document: 'bg-blue-500',
                  spreadsheet: 'bg-green-600',
                  other: 'bg-muted-foreground',
                }
                return (
                  <div key={ft.type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground capitalize">{ft.type}</span>
                      <span className="text-muted-foreground font-mono">
                        {ft.count} files • {formatBytes(ft.sizeBytes)}
                      </span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[ft.type] ?? 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Storage Summary */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Bucket Summary</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted/40 rounded border border-border/50">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Files</div>
                <div className="text-2xl font-bold font-mono text-foreground">{stats?.totalDocuments ?? 0}</div>
              </div>
              <div className="p-4 bg-muted/40 rounded border border-border/50">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Storage Used</div>
                <div className="text-2xl font-bold font-mono text-foreground">{stats ? formatBytes(stats.totalSizeBytes) : '—'}</div>
              </div>
              <div className="p-4 bg-muted/40 rounded border border-border/50">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Bucket</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">🔒 documents (private)</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Upload Modal ───────────────────────────────────────────────────── */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => void loadAll()}
        projects={projects}
        customers={customers}
      />

      {/* ─── Document Detail / Preview Modal ──────────────────────────────── */}
      {previewDoc && (
        <DocumentDetailModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDelete={() => {
            setDocuments((prev) => prev.filter((d) => d.id !== previewDoc.id))
            void getDocumentStats().then((res) => { if (res?.stats) setStats(res.stats) })
          }}
        />
      )}
    </div>
  )
}
