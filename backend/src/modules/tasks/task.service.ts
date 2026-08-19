import { prisma } from "../../lib/prisma";
import type {
  CreateTaskInput,
  TaskListQuery,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "./task.validation";

type RequestingUser = {
  id: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE" | string;
};

const taskInclude = {
  project: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employee: {
        select: {
          avatarUrl: true,
          firstName: true,
          lastName: true,
          designation: true,
        },
      },
    },
  },
} as const;

function serializeTask(task: any) {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    assignedToId: task.assignedToId,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    createdAt: task.createdAt ? task.createdAt.toISOString() : null,
    project: task.project,
    assignedTo: task.assignedTo
      ? {
          id: task.assignedTo.id,
          name: task.assignedTo.name,
          email: task.assignedTo.email,
          role: task.assignedTo.role,
          avatarUrl: task.assignedTo.employee?.avatarUrl || null,
          designation: task.assignedTo.employee?.designation || null,
        }
      : null,
  };
}

export async function listTasks(user: RequestingUser, query: TaskListQuery) {
  const where: any = {};

  if (query.projectId) {
    where.projectId = query.projectId;
  }

  if (query.assignedToId) {
    where.assignedToId = query.assignedToId;
  }

  if (query.status && query.status !== "all") {
    where.status = query.status;
  }

  if (query.priority && query.priority !== "all") {
    where.priority = query.priority;
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      skip,
      take: query.limit,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    tasks: tasks.map(serializeTask),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getTaskById(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: taskInclude,
  });

  if (!task) {
    throw new Error("Task not found");
  }

  return serializeTask(task);
}

export async function createTask(user: RequestingUser, input: CreateTaskInput) {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  let assignedUserId = input.assignedToId;
  if (assignedUserId) {
    // If an Employee.id was provided instead of User.id, resolve it
    const emp = await prisma.employee.findUnique({
      where: { id: assignedUserId },
      select: { userId: true },
    });
    if (emp) {
      assignedUserId = emp.userId;
    }
  }

  const task = await prisma.task.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      assignedToId: assignedUserId,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    },
    include: taskInclude,
  });

  return serializeTask(task);
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Task not found");
  }

  let assignedUserId = input.assignedToId;
  if (assignedUserId) {
    const emp = await prisma.employee.findUnique({
      where: { id: assignedUserId },
      select: { userId: true },
    });
    if (emp) {
      assignedUserId = emp.userId;
    }
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      assignedToId: input.assignedToId !== undefined ? assignedUserId : undefined,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : undefined,
    },
    include: taskInclude,
  });

  return serializeTask(updated);
}

export async function updateTaskStatus(id: string, input: UpdateTaskStatusInput) {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Task not found");
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: input.status,
    },
    include: taskInclude,
  });

  return serializeTask(updated);
}

export async function deleteTask(id: string) {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Task not found");
  }

  await prisma.task.delete({ where: { id } });
  return { id, deleted: true };
}
