import { useEffect, useState, useCallback } from 'react'
import StatCard from '../components/ui/StatCard'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input, { Select } from '../components/ui/Input'
import Tabs from '../components/ui/Tabs'
import {
  listProjects,
  getProjectsStats,
  createProject,
  updateProject,
  deleteProject,
  type Project,
  type ProjectStatus,
  type ProjectsStats,
} from '../api/projects'
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from '../api/tasks'
import { listEmployees, type Employee } from '../api/employees'
import { useAuth } from '../lib/auth'

// ─── Helpers ────────────────────────────────────────────────────────────────

function projectStatusVariant(status: ProjectStatus): 'success' | 'info' | 'gray' | 'warning' {
  switch (status) {
    case 'active': return 'success'
    case 'planning': return 'info'
    case 'completed': return 'gray'
    case 'on_hold': return 'warning'
  }
}

function taskPriorityVariant(priority: TaskPriority): 'danger' | 'warning' | 'gray' {
  switch (priority) {
    case 'high': return 'danger'
    case 'medium': return 'warning'
    case 'low': return 'gray'
  }
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDaysLeft(endDate: string | null): { label: string; isOverdue: boolean } {
  if (!endDate) return { label: '—', isOverdue: false }
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, isOverdue: true }
  if (diff === 0) return { label: 'Due today', isOverdue: false }
  return { label: `${diff}d left`, isOverdue: false }
}

const KANBAN_COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'text-muted-foreground' },
  { id: 'in_progress', label: 'In Progress', color: 'text-info' },
  { id: 'review', label: 'In Review', color: 'text-warning' },
  { id: 'done', label: 'Done', color: 'text-success' },
]

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-7 h-7 rounded-full object-cover border-2 border-card shadow-sm"
      />
    )
  }
  return (
    <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px] border-2 border-card shadow-sm">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Project Card Component ───────────────────────────────────────────────────

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onOpenTasks,
}: {
  project: Project
  onEdit: (p: Project) => void
  onDelete: (p: Project) => void
  onOpenTasks: (p: Project) => void
}) {
  const { taskStats } = project
  const dueInfo = getDaysLeft(project.endDate)

  return (
    <div className="flex flex-col bg-card border border-border rounded-[var(--radius-lg)] p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-foreground text-sm leading-tight truncate">{project.name}</h3>
          {project.customer && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Client: {project.customer.name}
            </p>
          )}
        </div>
        <Badge variant={projectStatusVariant(project.status)}>
          {project.status.replace('_', ' ')}
        </Badge>
      </div>

      {project.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">{taskStats.done}/{taskStats.total} tasks done</span>
          <span className="font-bold text-foreground">{taskStats.progressPercent}%</span>
        </div>
        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${taskStats.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
        {project.startDate && <span>Start: {formatDate(project.startDate)}</span>}
        {project.endDate && (
          <span className={dueInfo.isOverdue ? 'text-danger font-semibold' : ''}>
            Due: {formatDate(project.endDate)} ({dueInfo.label})
          </span>
        )}
      </div>

      {/* Task mini summary */}
      <div className="grid grid-cols-4 gap-1 text-center mb-4">
        {[
          { label: 'Todo', value: taskStats.todo, color: 'text-muted-foreground' },
          { label: 'Active', value: taskStats.inProgress, color: 'text-info' },
          { label: 'Review', value: taskStats.review, color: 'text-warning' },
          { label: 'Done', value: taskStats.done, color: 'text-success' },
        ].map((s) => (
          <div key={s.label} className="bg-muted/40 rounded p-1.5">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border">
        <Button size="sm" variant="outline" onClick={() => onOpenTasks(project)} className="flex-1 text-xs">
          View Tasks
        </Button>
        <button
          onClick={() => onEdit(project)}
          className="text-xs text-primary hover:underline font-medium cursor-pointer px-1"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(project)}
          className="text-xs text-danger hover:underline font-medium cursor-pointer px-1"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  tasks,
  onMoveTask,
  onEditTask,
  onDeleteTask,
}: {
  column: { id: TaskStatus; label: string; color: string }
  tasks: Task[]
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
}) {
  return (
    <div className="flex flex-col min-w-[260px] flex-1">
      <div className="flex items-center gap-2 px-3 py-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${column.id === 'todo' ? 'bg-muted-foreground' :
            column.id === 'in_progress' ? 'bg-info' :
              column.id === 'review' ? 'bg-warning' : 'bg-success'
          }`} />
        <span className={`font-bold text-sm ${column.color}`}>{column.label}</span>
        <span className="ml-auto bg-muted text-muted-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="space-y-2 flex-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-card border border-border rounded-[var(--radius)] p-3 shadow-xs hover:shadow-md transition-shadow group cursor-pointer"
            onClick={() => onEditTask(task)}
          >
            <div className="flex items-start justify-between gap-1 mb-1.5">
              <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2 flex-1">
                {task.title}
              </p>
              <Badge variant={taskPriorityVariant(task.priority)} className="shrink-0 text-[9px] px-1.5 py-0.5">
                {task.priority}
              </Badge>
            </div>

            {task.project && (
              <p className="text-[10px] text-muted-foreground mb-1.5 truncate">
                📁 {task.project.name}
              </p>
            )}

            {task.description && (
              <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-1">
              {task.assignedTo ? (
                <div className="flex items-center gap-1.5">
                  <UserAvatar name={task.assignedTo.name} avatarUrl={task.assignedTo.avatarUrl} />
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                    {task.assignedTo.name.split(' ')[0]}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
              )}

              {task.dueDate && (
                <span className={`text-[10px] font-mono ${getDaysLeft(task.dueDate).isOverdue ? 'text-danger font-semibold' : 'text-muted-foreground'
                  }`}>
                  {task.dueDate}
                </span>
              )}
            </div>

            {/* Status move buttons - visible on hover */}
            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              {KANBAN_COLUMNS.filter((c) => c.id !== column.id).map((c) => (
                <button
                  key={c.id}
                  onClick={() => onMoveTask(task.id, c.id)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  → {c.label}
                </button>
              ))}
              <button
                onClick={() => onDeleteTask(task)}
                className="text-[9px] px-1.5 py-0.5 rounded bg-danger/10 hover:bg-danger/20 font-medium text-danger transition-colors cursor-pointer ml-auto"
              >
                Del
              </button>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-[var(--radius)] p-4 text-center">
            <span className="text-xs text-muted-foreground">No tasks here</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Projects Page ────────────────────────────────────────────────────────────

export default function Projects() {
  const { user } = useAuth()
  const isHrOrAdmin = user?.role === 'ADMIN' || user?.role === 'HR'
  const canManageProjects = isHrOrAdmin || user?.role === 'MANAGER'

  const [activeTab, setActiveTab] = useState<'projects' | 'kanban' | 'tasks'>('projects')
  const [stats, setStats] = useState<ProjectsStats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Project filters
  const [projectSearch, setProjectSearch] = useState('')
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | 'all'>('all')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('') // for kanban filter

  // Task filters
  const [taskSearch, setTaskSearch] = useState('')
  const [taskStatus, setTaskStatus] = useState<TaskStatus | 'all'>('all')
  const [taskPriority, setTaskPriority] = useState<TaskPriority | 'all'>('all')

  // Project Modal
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectForm, setProjectForm] = useState({
    name: '', description: '', status: 'planning' as ProjectStatus,
    startDate: '', endDate: '',
  })
  const [savingProject, setSavingProject] = useState(false)
  const [projectError, setProjectError] = useState('')

  // Task Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskForm, setTaskForm] = useState({
    projectId: '', title: '', description: '',
    assignedToId: '', status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority, dueDate: '',
  })
  const [savingTask, setSavingTask] = useState(false)
  const [taskError, setTaskError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      getProjectsStats()
        .then((res) => {
          if (res?.stats) setStats(res.stats)
        })
        .catch((err) => console.error('Could not load project stats:', err))

      listProjects({
        status: projectStatus !== 'all' ? projectStatus : undefined,
        search: projectSearch || undefined,
        limit: 100,
      })
        .then((res) => {
          if (res?.projects) setProjects(res.projects)
        })
        .catch((err) => console.error('Could not load projects:', err))

      listTasks({ limit: 100 })
        .then((res) => {
          if (res?.tasks) setAllTasks(res.tasks)
        })
        .catch((err) => console.error('Could not load tasks:', err))
    } finally {
      setLoading(false)
    }
  }, [projectSearch, projectStatus])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    listEmployees({ limit: 100 })
      .then((res) => setEmployees(res.employees))
      .catch(() => { })
  }, [])

  // Derived task data for kanban
  const kanbanTasks = allTasks.filter((t) =>
    (!selectedProjectId || t.projectId === selectedProjectId)
  )

  const filteredTasksList = allTasks.filter((t) => {
    if (taskSearch && !t.title.toLowerCase().includes(taskSearch.toLowerCase())) return false
    if (taskStatus !== 'all' && t.status !== taskStatus) return false
    if (taskPriority !== 'all' && t.priority !== taskPriority) return false
    return true
  })

  async function handleMoveTask(taskId: string, newStatus: TaskStatus) {
    try {
      await updateTaskStatus(taskId, newStatus)
      setAllTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update task status')
    }
  }

  function openCreateProject() {
    setEditingProject(null)
    setProjectError('')
    setProjectForm({ name: '', description: '', status: 'planning', startDate: '', endDate: '' })
    setProjectModalOpen(true)
  }

  function openEditProject(project: Project) {
    setEditingProject(project)
    setProjectError('')
    setProjectForm({
      name: project.name,
      description: project.description ?? '',
      status: project.status,
      startDate: project.startDate ?? '',
      endDate: project.endDate ?? '',
    })
    setProjectModalOpen(true)
  }

  async function handleDeleteProject(project: Project) {
    if (!window.confirm(`Delete project "${project.name}"? This will also delete all tasks.`)) return
    try {
      await deleteProject(project.id)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete project')
    }
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault()
    if (!projectForm.name.trim()) { setProjectError('Project name is required'); return }
    setSavingProject(true); setProjectError('')
    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          name: projectForm.name,
          description: projectForm.description || null,
          status: projectForm.status,
          startDate: projectForm.startDate || null,
          endDate: projectForm.endDate || null,
        })
      } else {
        await createProject({
          name: projectForm.name,
          description: projectForm.description || null,
          status: projectForm.status,
          startDate: projectForm.startDate || null,
          endDate: projectForm.endDate || null,
        })
      }
      setProjectModalOpen(false)
      await loadData()
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Could not save project')
    } finally {
      setSavingProject(false)
    }
  }

  async function openCreateTask(projectId?: string) {
    setEditingTask(null)
    setTaskError('')

    // Ensure projects and employees are loaded
    if (projects.length === 0) {
      listProjects({ limit: 100 })
        .then((res) => { if (res?.projects) setProjects(res.projects) })
        .catch(console.error)
    }
    if (employees.length === 0) {
      listEmployees({ limit: 100 })
        .then((res) => { if (res?.employees) setEmployees(res.employees) })
        .catch(console.error)
    }

    setTaskForm({
      projectId: projectId ?? selectedProjectId ?? projects[0]?.id ?? '',
      title: '',
      description: '',
      assignedToId: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
    })
    setTaskModalOpen(true)
  }

  function openEditTask(task: Task) {
    setEditingTask(task)
    setTaskError('')
    setTaskForm({
      projectId: task.projectId,
      title: task.title,
      description: task.description ?? '',
      assignedToId: task.assignedToId ?? '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? '',
    })
    setTaskModalOpen(true)
  }

  async function handleDeleteTask(task: Task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) return
    try {
      await deleteTask(task.id)
      setAllTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete task')
    }
  }

  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskForm.title.trim()) { setTaskError('Task title is required'); return }
    if (!taskForm.projectId) { setTaskError('Please select a project'); return }
    setSavingTask(true); setTaskError('')
    try {
      const payload = {
        projectId: taskForm.projectId,
        title: taskForm.title,
        description: taskForm.description || null,
        assignedToId: taskForm.assignedToId || null,
        status: taskForm.status,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate || null,
      }
      if (editingTask) {
        const updated = await updateTask(editingTask.id, payload)
        setAllTasks((prev) => prev.map((t) => t.id === editingTask.id ? updated.task : t))
      } else {
        const created = await createTask(payload)
        setAllTasks((prev) => [created.task, ...prev])
      }
      setTaskModalOpen(false)
      await loadData()
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Could not save task')
    } finally {
      setSavingTask(false)
    }
  }

  const tabsConfig = [
    { id: 'projects', label: 'Projects Grid' },
    { id: 'kanban', label: 'Task Kanban' },
    { id: 'tasks', label: 'All Tasks List' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* ─── KPI Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          iconColor="blue"
          icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M6 6h6M6 9h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>}
          value={String(stats?.activeProjects ?? 0)}
          label="Active Projects"
          trend={`${stats?.planningProjects ?? 0} in planning`}
          trendType="neutral"
        />
        <StatCard
          iconColor="orange"
          icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6" /><path d="M9 5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>}
          value={String(stats?.inProgressTasks ?? 0)}
          label="Tasks In Progress"
          trend={`${stats?.totalTasks ?? 0} total tasks`}
          trendType="neutral"
        />
        <StatCard
          iconColor="red"
          icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9h12M3 5h12M3 13h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>}
          value={String(stats?.overdueTasks ?? 0)}
          label="Overdue Tasks"
          trend={stats?.overdueTasks ? 'Needs attention' : 'All on track'}
          trendType={stats?.overdueTasks ? 'down' : 'up'}
        />
        <StatCard
          iconColor="green"
          icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 4.5l-8.25 8.25L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          value={`${stats?.completionRate ?? 0}%`}
          label="Overall Completion Rate"
          trend={`${stats?.completedProjects ?? 0} projects done`}
          trendType="up"
        />
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs
        tabs={tabsConfig}
        active={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        actions={
          activeTab === 'projects' && canManageProjects ? (
            <Button size="sm" variant="primary" onClick={openCreateProject}>+ New Project</Button>
          ) : (
            <Button size="sm" variant="primary" onClick={() => openCreateTask()}>+ New Task</Button>
          )
        }
      />

      {/* ─── TAB 1: PROJECTS GRID ────────────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search projects…"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                prefix={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" /><path d="M9.5 9.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
              />
            </div>
            <div className="w-36">
              <Select value={projectStatus} onChange={(e) => setProjectStatus(e.target.value as any)}>
                <option value="all">All Statuses</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground mb-4">No projects found.</p>
              {canManageProjects && (
                <Button variant="primary" onClick={openCreateProject}>Create First Project</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={openEditProject}
                  onDelete={handleDeleteProject}
                  onOpenTasks={(p) => {
                    setSelectedProjectId(p.id)
                    setActiveTab('kanban')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: KANBAN BOARD ─────────────────────────────────────────────── */}
      {activeTab === 'kanban' && (
        <div className="space-y-4">
          {/* Project Filter */}
          <div className="flex items-center gap-3">
            <div className="w-64">
              <Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
            <span className="text-xs text-muted-foreground">
              {kanbanTasks.length} tasks {selectedProjectId ? `in ${projects.find(p => p.id === selectedProjectId)?.name}` : 'total'}
            </span>
          </div>

          {/* Kanban Board */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-4 min-w-fit">
              {KANBAN_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={kanbanTasks.filter((t) => t.status === col.id)}
                  onMoveTask={handleMoveTask}
                  onEditTask={openEditTask}
                  onDeleteTask={handleDeleteTask}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: ALL TASKS LIST ───────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search tasks…"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                prefix={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" /><path d="M9.5 9.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
              />
            </div>
            <div className="w-36">
              <Select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value as any)}>
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
              </Select>
            </div>
            <div className="w-36">
              <Select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as any)}>
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
          </div>

          <Card padding="none" className="overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
                  <th className="py-2.5 px-3">Task</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Assignee</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasksList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No tasks found</td>
                  </tr>
                ) : (
                  filteredTasksList.map((task) => {
                    const due = getDaysLeft(task.dueDate)
                    return (
                      <tr key={task.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-medium text-foreground max-w-[200px]">
                          <span className="truncate block">{task.title}</span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">
                          {task.project?.name ?? '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {task.assignedTo ? (
                            <div className="flex items-center gap-1.5">
                              <UserAvatar name={task.assignedTo.name} avatarUrl={task.assignedTo.avatarUrl} />
                              <span className="text-xs text-foreground">{task.assignedTo.name.split(' ')[0]}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={taskPriorityVariant(task.priority)}>{task.priority}</Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={
                            task.status === 'done' ? 'success' :
                              task.status === 'in_progress' ? 'info' :
                                task.status === 'review' ? 'warning' : 'gray'
                          }>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-xs">
                          {task.dueDate ? (
                            <span className={due.isOverdue ? 'text-danger font-semibold' : 'text-muted-foreground'}>
                              {task.dueDate} {due.isOverdue ? '(overdue)' : ''}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditTask(task)}
                              className="text-xs text-primary hover:underline cursor-pointer font-medium"
                            >Edit</button>
                            <button
                              onClick={() => void handleDeleteTask(task)}
                              className="text-xs text-danger hover:underline cursor-pointer font-medium"
                            >Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ─── MODAL: CREATE/EDIT PROJECT ──────────────────────────────────────── */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-[var(--radius-lg)] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold">{editingProject ? 'Edit Project' : 'Create New Project'}</h3>
              <button onClick={() => setProjectModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer text-lg">✕</button>
            </div>

            {projectError && (
              <div className="p-2 rounded bg-danger/10 text-danger text-xs border border-danger/20">{projectError}</div>
            )}

            <form onSubmit={(e) => void handleSaveProject(e)} className="space-y-3">
              <Input label="Project Name *" value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} required />

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-border bg-card text-foreground text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Project description…"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />
              </div>

              <Select label="Status" value={projectForm.status}
                onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as ProjectStatus })}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Start Date" type="date" value={projectForm.startDate}
                  onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} />
                <Input label="End Date" type="date" value={projectForm.endDate}
                  onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setProjectModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={savingProject}>
                  {savingProject ? 'Saving…' : editingProject ? 'Update Project' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE/EDIT TASK ─────────────────────────────────────────── */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-[var(--radius-lg)] shadow-2xl max-w-lg w-full p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
              <button onClick={() => setTaskModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer text-lg">✕</button>
            </div>

            {taskError && (
              <div className="p-2 rounded bg-danger/10 text-danger text-xs border border-danger/20">{taskError}</div>
            )}

            <form onSubmit={(e) => void handleSaveTask(e)} className="space-y-3">
              <Select label="Project *" value={taskForm.projectId}
                onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })} required>
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>

              <Input label="Task Title *" value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-border bg-card text-foreground text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Optional task details…"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                />
              </div>

              <Select label="Assign To" value={taskForm.assignedToId}
                onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })}>
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Select label="Status" value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="done">Done</option>
                </Select>

                <Select label="Priority" value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>

              <Input label="Due Date" type="date" value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setTaskModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={savingTask}>
                  {savingTask ? 'Saving…' : editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
