import { useEffect, useState, useCallback } from 'react'
import StatCard from '../components/ui/StatCard'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'
import Tabs from '../components/ui/Tabs'
import {
  convertLeadToCustomer,
  createCustomer,
  createLead,
  deleteCustomer,
  deleteLead,
  getCRMStats,
  listCustomers,
  listLeads,
  updateCustomer,
  updateLead,
  updateLeadStatus,
  type CRMStats,
  type Customer,
  type CustomerStatus,
  type Lead,
  type LeadStatus,
} from '../api/crm'
import { listEmployees, type Employee } from '../api/employees'
import { useAuth } from '../lib/auth'

function leadStatusVariant(status: LeadStatus): 'info' | 'warning' | 'purple' | 'success' | 'danger' {
  switch (status) {
    case 'new': return 'info'
    case 'contacted': return 'warning'
    case 'qualified': return 'purple'
    case 'won': return 'success'
    case 'lost': return 'danger'
  }
}

const PIPELINE_COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'new', label: 'New Leads', color: 'text-info' },
  { id: 'contacted', label: 'Contacted', color: 'text-warning' },
  { id: 'qualified', label: 'Qualified', color: 'text-purple' },
  { id: 'won', label: 'Won / Converted', color: 'text-success' },
  { id: 'lost', label: 'Lost', color: 'text-danger' },
]

export default function CRM() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'pipeline' | 'leads' | 'customers'>('pipeline')

  // Stats & Lists
  const [stats, setStats] = useState<CRMStats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [leadSearch, setLeadSearch] = useState('')
  const [leadStatusFilter, setLeadStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerStatusFilter, setCustomerStatusFilter] = useState<CustomerStatus | 'all'>('all')

  // Lead Modal
  const [leadModalOpen, setLeadModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [leadForm, setLeadForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    status: 'new' as LeadStatus,
    assignedToId: '',
    notes: '',
  })
  const [savingLead, setSavingLead] = useState(false)
  const [leadError, setLeadError] = useState('')

  // Customer Modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    billingAddress: '',
    shippingAddress: '',
    status: 'active' as CustomerStatus,
    assignedToId: '',
    notes: '',
  })
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [customerError, setCustomerError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      getCRMStats()
        .then((res) => { if (res?.stats) setStats(res.stats) })
        .catch(console.error)

      listLeads({
        status: leadStatusFilter !== 'all' ? leadStatusFilter : undefined,
        search: leadSearch || undefined,
        limit: 100,
      })
        .then((res) => { if (res?.leads) setLeads(res.leads) })
        .catch(console.error)

      listCustomers({
        status: customerStatusFilter !== 'all' ? customerStatusFilter : undefined,
        search: customerSearch || undefined,
        limit: 100,
      })
        .then((res) => { if (res?.customers) setCustomers(res.customers) })
        .catch(console.error)
    } finally {
      setLoading(false)
    }
  }, [leadStatusFilter, leadSearch, customerStatusFilter, customerSearch])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    listEmployees({ limit: 100 })
      .then((res) => { if (res?.employees) setEmployees(res.employees) })
      .catch(console.error)
  }, [])

  // Handle move lead status
  async function handleMoveLead(leadId: string, newStatus: LeadStatus) {
    try {
      await updateLeadStatus(leadId, newStatus)
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l))
      getCRMStats().then((res) => { if (res?.stats) setStats(res.stats) }).catch(() => { })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update lead stage')
    }
  }

  // Handle convert lead to customer
  async function handleConvertLead(lead: Lead) {
    if (!window.confirm(`Convert lead "${lead.name}" into a Customer account?`)) return
    try {
      await convertLeadToCustomer(lead.id)
      alert(`Lead ${lead.name} successfully converted to Customer!`)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not convert lead')
    }
  }

  // Open Lead Modal
  function openCreateLead() {
    setEditingLead(null)
    setLeadError('')
    setLeadForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      status: 'new',
      assignedToId: employees[0]?.id || '',
      notes: '',
    })
    setLeadModalOpen(true)
  }

  function openEditLead(lead: Lead) {
    setEditingLead(lead)
    setLeadError('')
    setLeadForm({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      status: lead.status,
      assignedToId: lead.assignedToId || '',
      notes: lead.notes || '',
    })
    setLeadModalOpen(true)
  }

  async function handleDeleteLead(lead: Lead) {
    if (!window.confirm(`Delete lead "${lead.name}"?`)) return
    try {
      await deleteLead(lead.id)
      setLeads((prev) => prev.filter((l) => l.id !== lead.id))
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete lead')
    }
  }

  async function handleSaveLead(e: React.FormEvent) {
    e.preventDefault()
    if (!leadForm.firstName.trim() || !leadForm.lastName.trim()) {
      setLeadError('First and Last names are required')
      return
    }
    setSavingLead(true)
    setLeadError('')
    try {
      if (editingLead) {
        await updateLead(editingLead.id, {
          firstName: leadForm.firstName,
          lastName: leadForm.lastName,
          email: leadForm.email || null,
          phone: leadForm.phone || null,
          company: leadForm.company || null,
          status: leadForm.status,
          assignedToId: leadForm.assignedToId || null,
          notes: leadForm.notes || null,
        })
      } else {
        await createLead({
          firstName: leadForm.firstName,
          lastName: leadForm.lastName,
          email: leadForm.email || null,
          phone: leadForm.phone || null,
          company: leadForm.company || null,
          status: leadForm.status,
          assignedToId: leadForm.assignedToId || null,
          notes: leadForm.notes || null,
        })
      }
      setLeadModalOpen(false)
      await loadData()
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Could not save lead')
    } finally {
      setSavingLead(false)
    }
  }

  // Open Customer Modal
  function openCreateCustomer() {
    setEditingCustomer(null)
    setCustomerError('')
    setCustomerForm({
      name: '',
      email: '',
      phone: '',
      billingAddress: '',
      shippingAddress: '',
      status: 'active',
      assignedToId: employees[0]?.id || '',
      notes: '',
    })
    setCustomerModalOpen(true)
  }

  function openEditCustomer(customer: Customer) {
    setEditingCustomer(customer)
    setCustomerError('')
    setCustomerForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      billingAddress: customer.billingAddress || '',
      shippingAddress: customer.shippingAddress || '',
      status: customer.status,
      assignedToId: customer.assignedToId || '',
      notes: customer.notes || '',
    })
    setCustomerModalOpen(true)
  }

  async function handleDeleteCustomer(customer: Customer) {
    if (!window.confirm(`Delete customer "${customer.name}"?`)) return
    try {
      await deleteCustomer(customer.id)
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id))
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete customer')
    }
  }

  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!customerForm.name.trim() || !customerForm.email.trim()) {
      setCustomerError('Company Name and Email are required')
      return
    }
    setSavingCustomer(true)
    setCustomerError('')
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          name: customerForm.name,
          email: customerForm.email,
          phone: customerForm.phone || null,
          billingAddress: customerForm.billingAddress || null,
          shippingAddress: customerForm.shippingAddress || null,
          status: customerForm.status,
          assignedToId: customerForm.assignedToId || null,
          notes: customerForm.notes || null,
        })
      } else {
        await createCustomer({
          name: customerForm.name,
          email: customerForm.email,
          phone: customerForm.phone || null,
          billingAddress: customerForm.billingAddress || null,
          shippingAddress: customerForm.shippingAddress || null,
          status: customerForm.status,
          assignedToId: customerForm.assignedToId || null,
          notes: customerForm.notes || null,
        })
      }
      setCustomerModalOpen(false)
      await loadData()
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : 'Could not save customer')
    } finally {
      setSavingCustomer(false)
    }
  }

  const tabsConfig = [
    { id: 'pipeline', label: 'Sales Pipeline (Kanban)', badge: stats?.newLeads || undefined },
    { id: 'leads', label: 'All Leads' },
    { id: 'customers', label: 'Customer Directory', badge: stats?.activeCustomers || undefined },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* ─── KPI Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          iconColor="blue"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM9 4.5v3l2 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          value={String(stats?.totalLeads ?? 0)}
          label="Total Pipeline Leads"
          trend={`${stats?.newLeads ?? 0} new incoming`}
          trendType="neutral"
        />
        <StatCard
          iconColor="purple"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 15.5c0-2.5 3-4 6-4s6 1.5 6 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          value={String(stats?.qualifiedLeads ?? 0)}
          label="Qualified Prospects"
          trend={`${stats?.contactedLeads ?? 0} contacted`}
          trendType="neutral"
        />
        <StatCard
          iconColor="green"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M15 4.5l-8.25 8.25L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          value={String(stats?.wonLeads ?? 0)}
          label="Deals Won"
          trend={`${stats?.conversionRate ?? 0}% conversion rate`}
          trendType="up"
        />
        <StatCard
          iconColor="orange"
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M2 7h14M6 11h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
          value={String(stats?.activeCustomers ?? 0)}
          label="Active Accounts"
          trend={`${stats?.totalCustomers ?? 0} total accounts`}
          trendType="neutral"
        />
      </div>

      {/* ─── Navigation Tabs & Action Bar ───────────────────────────────────── */}
      <Tabs
        tabs={tabsConfig}
        active={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        actions={
          activeTab === 'customers' ? (
            <Button size="sm" variant="primary" onClick={openCreateCustomer}>
              + Add Customer
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={openCreateLead}>
              + Add Lead
            </Button>
          )
        }
      />

      {/* ─── TAB 1: SALES PIPELINE (KANBAN) ─────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-4 min-w-fit">
              {PIPELINE_COLUMNS.map((col) => {
                const colLeads = leads.filter((l) => l.status === col.id)
                return (
                  <div key={col.id} className="flex flex-col min-w-[270px] flex-1">
                    <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-muted/40 rounded-md border border-border/50">
                      <span className={`w-2 h-2 rounded-full ${col.id === 'new' ? 'bg-info' :
                          col.id === 'contacted' ? 'bg-warning' :
                            col.id === 'qualified' ? 'bg-purple-500' :
                              col.id === 'won' ? 'bg-success' : 'bg-danger'
                        }`} />
                      <span className={`font-bold text-xs uppercase tracking-wider ${col.color}`}>
                        {col.label}
                      </span>
                      <span className="ml-auto bg-muted text-muted-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                        {colLeads.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-card border border-border rounded-[var(--radius)] p-3 shadow-xs hover:shadow-md transition-shadow group cursor-pointer"
                          onClick={() => openEditLead(lead)}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <div className="font-bold text-sm text-foreground leading-tight">
                              {lead.name}
                            </div>
                            <Badge variant={leadStatusVariant(lead.status)} className="shrink-0 text-[10px]">
                              {lead.status}
                            </Badge>
                          </div>

                          {lead.company && (
                            <div className="text-xs font-medium text-primary mb-1">
                              🏢 {lead.company}
                            </div>
                          )}

                          <div className="space-y-0.5 text-[11px] text-muted-foreground mb-2">
                            {lead.email && <div className="truncate">✉️ {lead.email}</div>}
                            {lead.phone && <div>📞 {lead.phone}</div>}
                          </div>

                          {lead.notes && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/30 p-1.5 rounded mb-2">
                              {lead.notes}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[10px] text-muted-foreground">
                            <span>Rep: {lead.assignedTo?.name.split(' ')[0] || 'Unassigned'}</span>
                            {lead.status !== 'won' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void handleConvertLead(lead)
                                }}
                                className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-semibold cursor-pointer"
                              >
                                Convert ➔
                              </button>
                            )}
                          </div>

                          {/* Quick stage mover */}
                          <div
                            className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {PIPELINE_COLUMNS.filter((c) => c.id !== col.id).map((c) => (
                              <button
                                key={c.id}
                                onClick={() => void handleMoveLead(lead.id, c.id)}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                → {c.label.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      {colLeads.length === 0 && (
                        <div className="border-2 border-dashed border-border rounded-[var(--radius)] p-6 text-center text-xs text-muted-foreground">
                          No leads in this stage
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ALL LEADS TABLE ─────────────────────────────────────────── */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <Card padding="sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search lead by name, company, email…"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  prefix={
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9.5 9.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  }
                />
              </div>
              <div className="w-36">
                <Select value={leadStatusFilter} onChange={(e) => setLeadStatusFilter(e.target.value as any)}>
                  <option value="all">All Stages</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </Select>
              </div>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3">Lead Name</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Stage</th>
                  <th className="py-2.5 px-3">Assigned Rep</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No leads found
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-semibold text-foreground">{lead.name}</td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">{lead.company || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        <div>{lead.email || '—'}</div>
                        <div>{lead.phone || ''}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={leadStatusVariant(lead.status)}>{lead.status}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        {lead.assignedTo?.name || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditLead(lead)}
                            className="text-xs text-primary hover:underline font-medium cursor-pointer"
                          >
                            Edit
                          </button>
                          {lead.status !== 'won' && (
                            <button
                              onClick={() => void handleConvertLead(lead)}
                              className="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer"
                            >
                              Convert
                            </button>
                          )}
                          <button
                            onClick={() => void handleDeleteLead(lead)}
                            className="text-xs text-danger hover:underline font-medium cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ─── TAB 3: CUSTOMERS DIRECTORY ──────────────────────────────────────── */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <Card padding="sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search customer name, email, phone…"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  prefix={
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9.5 9.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  }
                />
              </div>
              <div className="w-36">
                <Select value={customerStatusFilter} onChange={(e) => setCustomerStatusFilter(e.target.value as any)}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </Select>
              </div>
            </div>
          </Card>

          {customers.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground mb-3">No customers found.</p>
              <Button variant="primary" onClick={openCreateCustomer}>
                + Add First Customer
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((c) => (
                <Card key={c.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-bold text-base text-foreground leading-tight">{c.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.email}</p>
                      </div>
                      <Badge variant={c.status === 'active' ? 'success' : 'gray'}>{c.status}</Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground my-3 pt-2 border-t border-border">
                      {c.phone && <div>📞 {c.phone}</div>}
                      {c.billingAddress && <div className="truncate">📍 {c.billingAddress}</div>}
                    </div>

                    {c.projectsCount > 0 && (
                      <div className="bg-primary/5 rounded p-2 text-xs border border-primary/20 text-primary">
                        🚀 <strong>{c.projectsCount}</strong> Active Projects
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border">
                    <button
                      onClick={() => openEditCustomer(c)}
                      className="text-xs text-primary hover:underline font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void handleDeleteCustomer(c)}
                      className="text-xs text-danger hover:underline font-medium cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: CREATE/EDIT LEAD ─────────────────────────────────────────── */}
      {leadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-[var(--radius-lg)] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold">{editingLead ? 'Edit Lead' : 'Create New Lead'}</h3>
              <button onClick={() => setLeadModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer text-lg">
                ✕
              </button>
            </div>

            {leadError && (
              <div className="p-2 rounded bg-danger/10 text-danger text-xs border border-danger/20">{leadError}</div>
            )}

            <form onSubmit={(e) => void handleSaveLead(e)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name *"
                  value={leadForm.firstName}
                  onChange={(e) => setLeadForm({ ...leadForm, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Last Name *"
                  value={leadForm.lastName}
                  onChange={(e) => setLeadForm({ ...leadForm, lastName: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Company Name"
                placeholder="e.g. Acme Corp"
                value={leadForm.company}
                onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Email"
                  type="email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Pipeline Stage"
                  value={leadForm.status}
                  onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value as LeadStatus })}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </Select>

                <Select
                  label="Assigned Rep"
                  value={leadForm.assignedToId}
                  onChange={(e) => setLeadForm({ ...leadForm, assignedToId: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                label="Notes / Comments"
                placeholder="Deal background, requirements…"
                value={leadForm.notes}
                onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setLeadModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingLead}>
                  {savingLead ? 'Saving…' : editingLead ? 'Update Lead' : 'Create Lead'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE/EDIT CUSTOMER ─────────────────────────────────────── */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-[var(--radius-lg)] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold">{editingCustomer ? 'Edit Customer' : 'Create Customer'}</h3>
              <button onClick={() => setCustomerModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer text-lg">
                ✕
              </button>
            </div>

            {customerError && (
              <div className="p-2 rounded bg-danger/10 text-danger text-xs border border-danger/20">{customerError}</div>
            )}

            <form onSubmit={(e) => void handleSaveCustomer(e)} className="space-y-3">
              <Input
                label="Customer / Company Name *"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Email *"
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  required
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                />
              </div>

              <Input
                label="Billing Address"
                value={customerForm.billingAddress}
                onChange={(e) => setCustomerForm({ ...customerForm, billingAddress: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Status"
                  value={customerForm.status}
                  onChange={(e) => setCustomerForm({ ...customerForm, status: e.target.value as CustomerStatus })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </Select>

                <Select
                  label="Account Owner"
                  value={customerForm.assignedToId}
                  onChange={(e) => setCustomerForm({ ...customerForm, assignedToId: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setCustomerModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingCustomer}>
                  {savingCustomer ? 'Saving…' : editingCustomer ? 'Update Customer' : 'Create Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
