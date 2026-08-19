import { prisma } from "../../lib/prisma";
import type {
  CreateProjectInput,
  ProjectListQuery,
  UpdateProjectInput,
} from "./project.validation";

type RequestingUser = {
  id: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE" | string;
};

const projectInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  tasks: {
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          employee: {
            select: {
              avatarUrl: true,
            },
          },
        },
      },
    },
  },
} as const;

function serializeProject(project: any) {
  const tasks = project.tasks || [];
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t: any) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t: any) => t.status === "in_progress").length;
  const todoTasks = tasks.filter((t: any) => t.status === "todo").length;
  const reviewTasks = tasks.filter((t: any) => t.status === "review").length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    customerId: project.customerId,
    status: project.status,
    startDate: project.startDate ? project.startDate.toISOString().slice(0, 10) : null,
    endDate: project.endDate ? project.endDate.toISOString().slice(0, 10) : null,
    createdAt: project.createdAt ? project.createdAt.toISOString() : null,
    customer: project.customer,
    createdBy: project.createdBy,
    taskStats: {
      total: totalTasks,
      done: doneTasks,
      inProgress: inProgressTasks,
      todo: todoTasks,
      review: reviewTasks,
      progressPercent,
    },
    tasks: tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
      assignedTo: t.assignedTo
        ? {
            id: t.assignedTo.id,
            name: t.assignedTo.name,
            email: t.assignedTo.email,
            avatarUrl: t.assignedTo.employee?.avatarUrl || null,
          }
        : null,
    })),
  };
}

export async function listProjects(user: RequestingUser, query: ProjectListQuery) {
  const where: any = {};

  if (query.status && query.status !== "all") {
    where.status = query.status;
  }

  if (query.customerId) {
    where.customerId = query.customerId;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.project.count({ where }),
  ]);

  return {
    projects: projects.map(serializeProject),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: projectInclude,
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return serializeProject(project);
}

export async function createProject(user: RequestingUser, input: CreateProjectInput) {
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      customerId: input.customerId,
      status: input.status,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      createdById: user.id,
    },
    include: projectInclude,
  });

  return serializeProject(project);
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Project not found");
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      customerId: input.customerId,
      status: input.status,
      startDate: input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : undefined,
      endDate: input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : undefined,
    },
    include: projectInclude,
  });

  return serializeProject(updated);
}

export async function deleteProject(id: string) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Project not found");
  }

  await prisma.$transaction([
    prisma.task.deleteMany({ where: { projectId: id } }),
    prisma.project.delete({ where: { id } }),
  ]);

  return { id, deleted: true };
}

export async function getProjectsStats() {
  const today = new Date();

  const [
    totalProjects,
    activeProjects,
    completedProjects,
    planningProjects,
    totalTasks,
    inProgressTasks,
    doneTasks,
    overdueTasks,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: "active" } }),
    prisma.project.count({ where: { status: "completed" } }),
    prisma.project.count({ where: { status: "planning" } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "in_progress" } }),
    prisma.task.count({ where: { status: "done" } }),
    prisma.task.count({
      where: {
        dueDate: { lt: today },
        status: { not: "done" },
      },
    }),
  ]);

  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    planningProjects,
    totalTasks,
    inProgressTasks,
    doneTasks,
    overdueTasks,
    completionRate,
  };
}
