import { prisma } from "../../lib/prisma";
import type {
  CreateDepartmentInput,
  DepartmentListQuery,
  UpdateDepartmentInput,
} from "./department.validation";

type RequestingUser = {
  id: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE" | string;
};

const departmentInclude = {
  manager: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      departmentId: true,
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          designation: true,
          avatarUrl: true,
        },
      },
    },
  },
  _count: {
    select: {
      users: true,
    },
  },
} as const;

/**
 * The Department API accepts Employee.id or User.id as managerId.
 *
 * Department.managerId is stored internally as User.id.
 */
async function resolveManager(managerEmployeeId?: string | null) {
  if (!managerEmployeeId) {
    return null;
  }

  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { id: managerEmployeeId },
        { userId: managerEmployeeId },
      ],
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Manager employee not found");
  }

  if (!employee.user) {
    throw new Error("Manager is not linked to a user account");
  }

  if (!employee.user.isActive) {
    throw new Error("Manager is inactive");
  }

  if (
    employee.user.role !== "MANAGER" &&
    employee.user.role !== "HR" &&
    employee.user.role !== "ADMIN"
  ) {
    throw new Error("Selected employee is not a manager, HR, or admin user");
  }

  return {
    employeeId: employee.id,
    userId: employee.user.id,
  };
}

function serializeDepartment(department: any) {
  return {
    id: department.id,
    name: department.name,
    description: department.description,
    isActive: department.isActive,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
    manager: department.manager
      ? {
          id: department.manager.id,
          employeeId: department.manager.employee?.id ?? null,
          name: department.manager.name,
          email: department.manager.email,
          role: department.manager.role,
          isActive: department.manager.isActive,
          firstName: department.manager.employee?.firstName ?? department.manager.name,
          lastName: department.manager.employee?.lastName ?? "",
          designation: department.manager.employee?.designation ?? null,
          avatarUrl: department.manager.employee?.avatarUrl ?? null,
        }
      : null,
    employeeCount: department._count?.users ?? 0,
    ...(department.users
      ? {
          members: department.users.map((u: any) => ({
            id: u.employee?.id ?? u.id,
            userId: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            employeeCode: u.employee?.employeeCode ?? "N/A",
            firstName: u.employee?.firstName ?? u.name,
            lastName: u.employee?.lastName ?? "",
            designation: u.employee?.designation ?? null,
            status: u.employee?.status ?? (u.isActive ? "active" : "inactive"),
            phone: u.employee?.phone ?? null,
            avatarUrl: u.employee?.avatarUrl ?? null,
          })),
        }
      : {}),
  };
}

export async function listDepartments(
  requester: RequestingUser,
  query: DepartmentListQuery,
) {
  const { search, isActive, page, limit } = query;

  const where: any = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        manager: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  // Managers see only their department.
  if (requester.role === "MANAGER") {
    where.managerId = requester.id;
  }

  // Employees see only their own department.
  if (requester.role === "EMPLOYEE") {
    where.users = {
      some: {
        id: requester.id,
      },
    };
  }

  const [total, departments] = await Promise.all([
    prisma.department.count({
      where,
    }),

    prisma.department.findMany({
      where,
      include: departmentInclude,
      orderBy: {
        name: "asc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    departments: departments.map(serializeDepartment),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDepartmentById(
  id: string,
  requester: RequestingUser,
) {
  const department = await prisma.department.findUnique({
    where: {
      id,
    },
    include: {
      ...departmentInclude,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              designation: true,
              status: true,
              avatarUrl: true,
              phone: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!department) {
    throw new Error("Department not found");
  }

  if (
    requester.role === "MANAGER" &&
    department.managerId !== requester.id
  ) {
    throw new Error(
      "You do not have permission to view this department",
    );
  }

  if (requester.role === "EMPLOYEE") {
    const member = await prisma.user.findFirst({
      where: {
        id: requester.id,
        departmentId: id,
      },
      select: {
        id: true,
      },
    });

    if (!member) {
      throw new Error(
        "You do not have permission to view this department",
      );
    }
  }

  return serializeDepartment(department);
}

export async function createDepartment(
  requester: RequestingUser,
  input: CreateDepartmentInput,
) {
  if (
    requester.role !== "ADMIN" &&
    requester.role !== "HR"
  ) {
    throw new Error(
      "You do not have permission to create departments",
    );
  }

  const manager = await resolveManager(input.managerId);

  const existing = await prisma.department.findUnique({
    where: {
      name: input.name,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new Error(
      "A department with this name already exists",
    );
  }

  return prisma.$transaction(async (tx) => {
    /*
     * A manager/HR can only manage one department.
     */
    if (manager) {
      await tx.department.updateMany({
        where: {
          managerId: manager.userId,
        },
        data: {
          managerId: null,
        },
      });

      await tx.user.update({
        where: {
          id: manager.userId,
        },
        data: {
          departmentId: null,
        },
      });
    }

    const department = await tx.department.create({
      data: {
        name: input.name,
        description: input.description ?? null,

        // IMPORTANT:
        // Department stores User.id internally.
        managerId: manager?.userId ?? null,
      },

      include: departmentInclude,
    });

    if (manager) {
      await tx.user.update({
        where: {
          id: manager.userId,
        },
        data: {
          departmentId: department.id,
        },
      });
    }

    return serializeDepartment(department);
  });
}

export async function updateDepartment(
  requester: RequestingUser,
  id: string,
  input: UpdateDepartmentInput,
) {
  if (
    requester.role !== "ADMIN" &&
    requester.role !== "HR"
  ) {
    throw new Error(
      "You do not have permission to update departments",
    );
  }

  const existing = await prisma.department.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      managerId: true,
    },
  });

  if (!existing) {
    throw new Error("Department not found");
  }

  /*
   * Only resolve the manager when managerId is actually
   * present in the PATCH body.
   *
   * This means:
   *
   * PATCH { "name": "Marketing" }
   *
   * does NOT touch the existing manager.
   */
  const manager =
    input.managerId !== undefined
      ? await resolveManager(input.managerId)
      : undefined;

  if (
    input.name &&
    input.name !== existing.name
  ) {
    const duplicate = await prisma.department.findUnique({
      where: {
        name: input.name,
      },
      select: {
        id: true,
      },
    });

    if (
      duplicate &&
      duplicate.id !== id
    ) {
      throw new Error(
        "A department with this name already exists",
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    /*
     * Manager was changed or removed.
     *
     * Clear the old manager's department assignment.
     */
    if (
      input.managerId !== undefined &&
      existing.managerId &&
      existing.managerId !== manager?.userId
    ) {
      await tx.user.updateMany({
        where: {
          id: existing.managerId,
          departmentId: id,
        },
        data: {
          departmentId: null,
        },
      });
    }

    /*
     * If assigning a new manager:
     *
     * 1. Remove them as manager from any previous department.
     * 2. Clear their old department.
     */
    if (manager) {
      await tx.department.updateMany({
        where: {
          managerId: manager.userId,
          id: {
            not: id,
          },
        },
        data: {
          managerId: null,
        },
      });

      await tx.user.updateMany({
        where: {
          id: manager.userId,
          departmentId: {
            not: id,
          },
        },
        data: {
          departmentId: null,
        },
      });
    }

    const department = await tx.department.update({
      where: {
        id,
      },

      data: {
        ...(input.name !== undefined
          ? {
              name: input.name,
            }
          : {}),

        ...(input.description !== undefined
          ? {
              description: input.description,
            }
          : {}),

        ...(input.managerId !== undefined
          ? {
              // Convert Employee.id -> User.id
              managerId: manager?.userId ?? null,
            }
          : {}),

        ...(input.isActive !== undefined
          ? {
              isActive: input.isActive,
            }
          : {}),
      },

      include: departmentInclude,
    });

    /*
     * Finally assign the new manager to this department.
     */
    if (manager) {
      await tx.user.update({
        where: {
          id: manager.userId,
        },
        data: {
          departmentId: id,
        },
      });
    }

    return serializeDepartment(department);
  });
}

export async function deactivateDepartment(
  requester: RequestingUser,
  id: string,
) {
  if (requester.role !== "ADMIN") {
    throw new Error(
      "Only ADMIN can deactivate departments",
    );
  }

  const department = await prisma.department.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      managerId: true,
      isActive: true,
    },
  });

  if (!department) {
    throw new Error("Department not found");
  }

  if (!department.isActive) {
    throw new Error(
      "Department is already inactive",
    );
  }

  const updated = await prisma.$transaction(
    async (tx) => {
      const result = await tx.department.update({
        where: {
          id,
        },
        data: {
          isActive: false,
          managerId: null,
        },
        include: departmentInclude,
      });

      if (department.managerId) {
        await tx.user.updateMany({
          where: {
            id: department.managerId,
            departmentId: id,
          },
          data: {
            departmentId: null,
          },
        });
      }

      return result;
    },
  );

  return serializeDepartment(updated);
}