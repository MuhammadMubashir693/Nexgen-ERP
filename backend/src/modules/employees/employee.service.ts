import { prisma } from "../../lib/prisma";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import type {
  CreateEmployeeInput,
  EmployeeListQuery,
  UpdateEmployeeInput,
} from "./employee.validation";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getAvatarExtension(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error("Unsupported avatar image type");
  }
}

type RequestingUser = {
  id: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE" | string;
};

const employeeInclude = {
  user: {
    include: {
      department: true,
    },
  },
  manager: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      designation: true,
    },
  },
} as const;

function toDate(value?: string | null) {
  if (value == null || value === "") return null;
  return new Date(value);
}

function decimalToNumber(value: unknown) {
  if (value == null) return undefined;
  return Number(value);
}

function serializeEmployee(employee: any, requesterRole: string) {
  const result = {
    id: employee.id,
    userId: employee.userId,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone,
    address: employee.address,
    designation: employee.designation,
    avatarUrl: employee.avatarUrl,
    gender: employee.gender,
    dateOfBirth: employee.dateOfBirth,
    dateOfJoining: employee.dateOfJoining,
    employmentType: employee.employmentType,
    status: employee.status,
    manager: employee.manager,
    user: {
      id: employee.user.id,
      name: employee.user.name,
      email: employee.user.email,
      role: employee.user.role,
      isActive: employee.user.isActive,
      themeAccent: employee.user.themeAccent,
      department: employee.user.department,
    },
  };

  // Salary is sensitive HR information.
  if (requesterRole === "ADMIN" || requesterRole === "HR") {
    return {
      ...result,
      basicSalary: decimalToNumber(employee.basicSalary),
    };
  }

  return result;
}

async function assertDepartmentExists(departmentId?: string | null) {
  if (!departmentId) return;

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, isActive: true },
  });

  if (!department) {
    throw new Error("Department not found");
  }

  if (!department.isActive) {
    throw new Error("Department is inactive");
  }
}

async function assertManagerExists(managerId?: string | null) {
  if (!managerId) return;

  const manager = await prisma.employee.findUnique({
    where: { id: managerId },
    select: {
      id: true,
      status: true,
      user: {
        select: {
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!manager) {
    throw new Error("Manager employee not found");
  }

  if (manager.status !== "active" || !manager.user.isActive) {
    throw new Error("Manager is inactive");
  }

  if (manager.user.role !== "MANAGER" && manager.user.role !== "ADMIN") {
    throw new Error("Selected employee is not a manager");
  }
}

function canManageRole(requesterRole: string, targetRole: string) {
  if (requesterRole === "ADMIN") return true;
  return requesterRole === "HR" && (targetRole === "EMPLOYEE" || targetRole === "MANAGER");
}

export async function listEmployees(
  requester: RequestingUser,
  query: EmployeeListQuery,
) {
  const { search, departmentId, role, status, page, limit } = query;

  const where: any = {};

  if (status) where.status = status;
  if (departmentId) where.user = { departmentId };
  if (role) {
    where.user = {
      ...(where.user ?? {}),
      role,
    };
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { employeeCode: { contains: search, mode: "insensitive" } },
      {
        user: {
          email: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  // Managers only see employees in their department.
  if (requester.role === "MANAGER") {
    const requesterEmployee = await prisma.employee.findUnique({
      where: { userId: requester.id },
      select: { user: { select: { departmentId: true } } },
    });

    const managerDepartmentId = requesterEmployee?.user.departmentId;

    if (!managerDepartmentId) {
      return { employees: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    where.user = {
      ...(where.user ?? {}),
      departmentId: managerDepartmentId,
    };
  }

  // Employees can only retrieve themselves through the normal list endpoint.
  if (requester.role === "EMPLOYEE") {
    where.userId = requester.id;
  }

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      include: employeeInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    employees: employees.map((employee) =>
      serializeEmployee(employee, requester.role),
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getEmployeeById(
  id: string,
  requester: RequestingUser,
) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: employeeInclude,
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  if (requester.role === "EMPLOYEE" && employee.userId !== requester.id) {
    throw new Error("You do not have permission to view this employee");
  }

  if (requester.role === "MANAGER") {
    const requesterEmployee = await prisma.employee.findUnique({
      where: { userId: requester.id },
      select: { user: { select: { departmentId: true } } },
    });

    if (
      !requesterEmployee?.user.departmentId ||
      employee.user.departmentId !== requesterEmployee.user.departmentId
    ) {
      throw new Error("You do not have permission to view this employee");
    }
  }

  return serializeEmployee(employee, requester.role);
}

export async function createEmployee(
  requester: RequestingUser,
  input: CreateEmployeeInput,
) {
  if (!canManageRole(requester.role, input.role)) {
    throw new Error(
      requester.role === "HR"
        ? "HR can only create EMPLOYEE or MANAGER users"
        : "You do not have permission to create this role",
    );
  }

  await assertDepartmentExists(input.departmentId);
  await assertManagerExists(input.managerId);

  const existingEmployee = await prisma.employee.findFirst({
    where: {
      OR: [
        { employeeCode: input.employeeCode },
        { user: { email: input.email } },
      ],
    },
    select: { id: true },
  });

  if (existingEmployee) {
    throw new Error("An employee with this employee code or email already exists");
  }

  let authUserId: string | null = null;

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        name: input.name,
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? "Could not create Supabase Auth user");
    }

    authUserId = data.user.id;

    const employee = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: authUserId!,
          name: input.name,
          email: input.email,
          role: input.role,
          departmentId: input.departmentId ?? null,
        },
      });

      return tx.employee.create({
        data: {
          userId: user.id,
          employeeCode: input.employeeCode,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone ?? null,
          address: input.address ?? null,
          designation: input.designation ?? null,
          gender: input.gender ?? null,
          dateOfBirth: toDate(input.dateOfBirth),
          dateOfJoining: toDate(input.dateOfJoining),
          employmentType: input.employmentType,
          basicSalary: input.basicSalary,
          managerId: input.managerId ?? null,
        },
        include: employeeInclude,
      });
    });

    return serializeEmployee(employee, requester.role);
  } catch (error) {
    if (authUserId) {
      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(authUserId);

      if (deleteError) {
        console.error(
          "Could not clean up Supabase Auth user:",
          deleteError.message,
        );
      }
    }

    throw error;
  }
}

export async function updateEmployee(
  requester: RequestingUser,
  id: string,
  input: UpdateEmployeeInput,
) {
  const existing = await prisma.employee.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  if (!existing) {
    throw new Error("Employee not found");
  }

  if (!canManageRole(requester.role, input.role ?? existing.user.role)) {
    throw new Error("You do not have permission to assign this role");
  }

  await assertDepartmentExists(input.departmentId);
  await assertManagerExists(input.managerId);

  if (input.employeeCode && input.employeeCode !== existing.employeeCode) {
    const duplicate = await prisma.employee.findUnique({
      where: { employeeCode: input.employeeCode },
      select: { id: true },
    });

    if (duplicate && duplicate.id !== id) {
      throw new Error("Employee code is already in use");
    }
  }

  if (input.email && input.email !== existing.user.email) {
    const duplicate = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (duplicate && duplicate.id !== existing.userId) {
      throw new Error("Email is already in use");
    }
  }

  const previousEmail = existing.user.email;
  let authEmailChanged = false;

  try {
    if (input.email && input.email !== previousEmail) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        existing.userId,
        {
          email: input.email,
          email_confirm: true,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      authEmailChanged = true;
    }

    const employee = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.departmentId !== undefined
            ? { departmentId: input.departmentId }
            : {}),
          ...(input.status !== undefined
            ? { isActive: input.status === "active" }
            : {}),
        },
      });

      return tx.employee.update({
        where: { id },
        data: {
          ...(input.employeeCode !== undefined
            ? { employeeCode: input.employeeCode }
            : {}),
          ...(input.firstName !== undefined
            ? { firstName: input.firstName }
            : {}),
          ...(input.lastName !== undefined
            ? { lastName: input.lastName }
            : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.designation !== undefined
            ? { designation: input.designation }
            : {}),
          ...(input.gender !== undefined ? { gender: input.gender } : {}),
          ...(input.dateOfBirth !== undefined
            ? { dateOfBirth: toDate(input.dateOfBirth) }
            : {}),
          ...(input.dateOfJoining !== undefined
            ? { dateOfJoining: toDate(input.dateOfJoining) }
            : {}),
          ...(input.employmentType !== undefined
            ? { employmentType: input.employmentType }
            : {}),
          ...(input.basicSalary !== undefined
            ? { basicSalary: input.basicSalary }
            : {}),
          ...(input.managerId !== undefined
            ? { managerId: input.managerId }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
        include: employeeInclude,
      });
    });

    return serializeEmployee(employee, requester.role);
  } catch (error) {
    // Roll the Auth email back if Prisma failed after Auth was updated.
    if (authEmailChanged) {
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.updateUserById(existing.userId, {
          email: previousEmail,
          email_confirm: true,
        });

      if (rollbackError) {
        console.error(
          "Could not roll back Supabase Auth email:",
          rollbackError.message,
        );
      }
    }

    throw error;
  }
}

export async function deactivateEmployee(
  requester: RequestingUser,
  id: string,
) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      user: {
        select: {
          id: true,
          isActive: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  if (employee.userId === requester.id) {
    throw new Error("You cannot deactivate your own account");
  }

  if (employee.status !== "active") {
    throw new Error("Employee is already inactive");
  }

  await prisma.$transaction([
    prisma.employee.update({
      where: { id },
      data: { status: "terminated" },
    }),
    prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: false },
    }),
  ]);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    employee.userId,
    {
      ban_duration: "876000h",
    },
  );

  if (error) {
    // Database state is still safe: the employee is inactive in the ERP.
    console.error("Could not ban Supabase Auth user:", error.message);
  }

  return {
    id: employee.id,
    status: "terminated",
    isActive: false,
  };
}


export async function hardDeleteEmployee(
  requester: RequestingUser,
  id: string,
) {
  if (requester.role !== "ADMIN") {
    throw new Error("Only ADMIN can permanently delete employees");
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      employeeCode: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  if (employee.userId === requester.id) {
    throw new Error("You cannot permanently delete your own account");
  }

  /*
   * The schema uses RESTRICT for Employee -> Attendance,
   * Employee -> LeaveRequest, Employee -> User, User -> Document and
   * User -> Notification. Other User relations are nullable and use
   * ON DELETE SET NULL, so we only explicitly remove the required dependents.
   * ActivityLog is preserved by clearing its userId first.
   *
   * NOTE: deleting Document rows removes document metadata from the database.
   * The actual object in Supabase Storage is NOT removed here because the
   * current schema only stores fileUrl and has no storage bucket/path helper.
   */
  await prisma.$transaction(async (tx) => {
    // Preserve audit history without retaining a foreign key to the deleted user.
    await tx.activityLog.updateMany({
      where: { userId: employee.userId },
      data: { userId: null },
    });

    // Required User -> Document relation.
    await tx.document.deleteMany({
      where: { ownerId: employee.userId },
    });

    // Required User -> Notification relation.
    await tx.notification.deleteMany({
      where: { userId: employee.userId },
    });

    // Required Employee -> Attendance relation.
    await tx.attendance.deleteMany({
      where: { employeeId: employee.id },
    });

    // Required Employee -> LeaveRequest relation.
    await tx.leaveRequest.deleteMany({
      where: { employeeId: employee.id },
    });

    // Remove the Employee profile before its required User relation.
    await tx.employee.delete({
      where: { id: employee.id },
    });

    // Department.managerId and the other nullable User foreign keys use
    // ON DELETE SET NULL according to the current migration.
    await tx.user.delete({
      where: { id: employee.userId },
    });
  });

  /*
   * Supabase Auth is outside the Prisma/Postgres transaction. The database
   * deletion is committed first; if Auth deletion fails, report it explicitly
   * so the remaining Auth account can be removed manually.
   */
  const { error: authDeleteError } =
    await supabaseAdmin.auth.admin.deleteUser(employee.userId);

  if (authDeleteError) {
    console.error(
      `Employee ${employee.id} was hard-deleted from the ERP database, but ` +
      `Supabase Auth user ${employee.userId} could not be deleted:`,
      authDeleteError.message,
    );

    return {
      id: employee.id,
      employeeCode: employee.employeeCode,
      deleted: true,
      authDeleted: false,
      warning:
        "Employee data was permanently deleted from the ERP database, " +
        "but the Supabase Auth account could not be deleted automatically. " +
        "Delete that Auth user manually from Supabase.",
    };
  }

  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    deleted: true,
    authDeleted: true,
  };
}

export async function uploadAvatar(
  requester: RequestingUser,
  file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
  },
) {
  if (!ALLOWED_AVATAR_TYPES.has(file.mimetype)) {
    throw new Error("Avatar must be a JPG, PNG, or WebP image");
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("Avatar image must be 5 MB or smaller");
  }

  const employee = await prisma.employee.findUnique({
    where: { userId: requester.id },
    select: {
      id: true,
      userId: true,
      avatarUrl: true,
    },
  });

  if (!employee) {
    throw new Error("Employee profile not found");
  }

  const extension = getAvatarExtension(file.mimetype);

  const path = `${employee.userId}/profile.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`Could not upload avatar: ${uploadError.message}`);
  }

  if (employee.avatarUrl && employee.avatarUrl !== path) {
    const { error: removeError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .remove([employee.avatarUrl]);

    if (removeError) {
      console.error(
        "Could not remove previous avatar:",
        removeError.message,
      );
    }
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      avatarUrl: path,
    },
  });

  return {
    avatarUrl: path,
  };
}

export async function deleteAvatar(requester: RequestingUser) {
  const employee = await prisma.employee.findUnique({
    where: { userId: requester.id },
    select: {
      id: true,
      avatarUrl: true,
    },
  });

  if (!employee) {
    throw new Error("Employee profile not found");
  }

  if (!employee.avatarUrl) {
    return {
      avatarUrl: null,
    };
  }

  const { error } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .remove([employee.avatarUrl]);

  if (error) {
    throw new Error(`Could not remove avatar: ${error.message}`);
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      avatarUrl: null,
    },
  });

  return {
    avatarUrl: null,
  };
}