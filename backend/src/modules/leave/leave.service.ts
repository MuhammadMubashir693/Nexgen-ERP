import { prisma } from "../../lib/prisma";
import { notify } from "../../lib/notify";
import type {
  CreateLeaveRequestInput,
  CreateLeaveTypeInput,
  LeaveListQuery,
  LeaveStatsQuery,
  UpdateLeaveStatusInput,
  UpdateLeaveTypeInput,
} from "./leave.validation";

type RequestingUser = {
  id: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE" | string;
};

const leaveRequestInclude = {
  leaveType: true,
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      designation: true,
      avatarUrl: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
  approvedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
} as const;

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

function serializeLeaveRequest(record: any) {
  const start = record.startDate instanceof Date ? record.startDate : new Date(record.startDate);
  const end = record.endDate instanceof Date ? record.endDate : new Date(record.endDate);
  const days = calculateDaysBetween(start, end);

  return {
    id: record.id,
    employeeId: record.employeeId,
    leaveTypeId: record.leaveTypeId,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    days,
    reason: record.reason,
    status: record.status,
    approvedById: record.approvedById,
    approvedAt: record.approvedAt ? record.approvedAt.toISOString() : null,
    createdAt: record.createdAt ? record.createdAt.toISOString() : null,
    leaveType: record.leaveType
      ? {
          id: record.leaveType.id,
          name: record.leaveType.name,
          daysPerYear: record.leaveType.daysPerYear,
          isPaid: record.leaveType.isPaid,
          isActive: record.leaveType.isActive,
        }
      : null,
    employee: record.employee
      ? {
          id: record.employee.id,
          employeeCode: record.employee.employeeCode,
          firstName: record.employee.firstName,
          lastName: record.employee.lastName,
          name: `${record.employee.firstName} ${record.employee.lastName}`.trim(),
          designation: record.employee.designation,
          avatarUrl: record.employee.avatarUrl,
          department: record.employee.user?.department ?? null,
          role: record.employee.user?.role ?? null,
        }
      : null,
    approvedBy: record.approvedBy
      ? {
          id: record.approvedBy.id,
          name: record.approvedBy.name,
          email: record.approvedBy.email,
          role: record.approvedBy.role,
        }
      : null,
  };
}

async function resolveEmployeeForUser(userId: string) {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });

  if (!employee) {
    throw new Error("No employee profile linked to current user account");
  }

  if (employee.status !== "active") {
    throw new Error("Employee account is not active");
  }

  return employee;
}

// ─────────────────────────────────────────────────────────────
// LEAVE TYPES
// ─────────────────────────────────────────────────────────────

export async function listLeaveTypes() {
  const types = await prisma.leaveType.findMany({
    orderBy: { name: "asc" },
  });
  return types;
}

export async function createLeaveType(
  user: RequestingUser,
  input: CreateLeaveTypeInput,
) {
  if (user.role !== "ADMIN" && user.role !== "HR") {
    throw new Error("Only HR and Admin can create leave types");
  }

  const existing = await prisma.leaveType.findUnique({
    where: { name: input.name },
  });

  if (existing) {
    throw new Error(`Leave type '${input.name}' already exists`);
  }

  const leaveType = await prisma.leaveType.create({
    data: {
      name: input.name,
      daysPerYear: input.daysPerYear,
      isPaid: input.isPaid,
      isActive: input.isActive,
    },
  });

  return leaveType;
}

export async function updateLeaveType(
  user: RequestingUser,
  id: string,
  input: UpdateLeaveTypeInput,
) {
  if (user.role !== "ADMIN" && user.role !== "HR") {
    throw new Error("Only HR and Admin can update leave types");
  }

  const existing = await prisma.leaveType.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Leave type not found");
  }

  if (input.name && input.name !== existing.name) {
    const duplicate = await prisma.leaveType.findUnique({
      where: { name: input.name },
    });
    if (duplicate) {
      throw new Error(`Leave type '${input.name}' already exists`);
    }
  }

  const updated = await prisma.leaveType.update({
    where: { id },
    data: input,
  });

  return updated;
}

// ─────────────────────────────────────────────────────────────
// LEAVE REQUESTS
// ─────────────────────────────────────────────────────────────

export async function listLeaveRequests(
  user: RequestingUser,
  query: LeaveListQuery,
) {
  const where: any = {};

  // Role Scoping
  if (user.role === "EMPLOYEE") {
    const employee = await resolveEmployeeForUser(user.id);
    where.employeeId = employee.id;
  } else if (user.role === "MANAGER") {
    const managerEmployee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const managedDepartments = await prisma.department.findMany({
      where: { managerId: user.id },
      select: { id: true },
    });
    const departmentIds = managedDepartments.map((d) => d.id);

    where.employee = {
      OR: [
        { id: managerEmployee?.id ?? "__none__" },
        { managerId: managerEmployee?.id ?? "__none__" },
        { user: { departmentId: { in: departmentIds } } },
      ],
    };
  }

  // Explicit filters
  if (query.employeeId && (user.role === "ADMIN" || user.role === "HR" || user.role === "MANAGER")) {
    where.employeeId = query.employeeId;
  }

  if (query.departmentId && (user.role === "ADMIN" || user.role === "HR")) {
    where.employee = {
      ...where.employee,
      user: {
        ...where.employee?.user,
        departmentId: query.departmentId,
      },
    };
  }

  if (query.leaveTypeId) {
    where.leaveTypeId = query.leaveTypeId;
  }

  if (query.status && query.status !== "all") {
    where.status = query.status;
  }

  if (query.startDate || query.endDate) {
    if (query.startDate && query.endDate) {
      where.OR = [
        {
          startDate: {
            lte: parseDateOnly(query.endDate),
          },
          endDate: {
            gte: parseDateOnly(query.startDate),
          },
        },
      ];
    } else if (query.startDate) {
      where.endDate = { gte: parseDateOnly(query.startDate) };
    } else if (query.endDate) {
      where.startDate = { lte: parseDateOnly(query.endDate) };
    }
  }

  if (query.search) {
    where.employee = {
      ...where.employee,
      OR: [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { employeeCode: { contains: query.search, mode: "insensitive" } },
      ],
    };
  }

  const skip = (query.page - 1) * query.limit;

  const [records, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: leaveRequestInclude,
      orderBy: [{ createdAt: "desc" }, { startDate: "desc" }],
      skip,
      take: query.limit,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return {
    records: records.map(serializeLeaveRequest),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function createLeaveRequest(
  user: RequestingUser,
  input: CreateLeaveRequestInput,
) {
  let targetEmployeeId: string;

  if (input.employeeId && (user.role === "ADMIN" || user.role === "HR")) {
    targetEmployeeId = input.employeeId;
  } else {
    const employee = await resolveEmployeeForUser(user.id);
    targetEmployeeId = employee.id;
  }

  const leaveType = await prisma.leaveType.findUnique({
    where: { id: input.leaveTypeId },
  });

  if (!leaveType) {
    throw new Error("Selected leave type does not exist");
  }

  if (!leaveType.isActive) {
    throw new Error("Selected leave type is inactive");
  }

  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);

  if (endDate < startDate) {
    throw new Error("End date cannot be before start date");
  }

  // Check for overlapping pending or approved leave requests for the same employee
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: targetEmployeeId,
      status: { in: ["pending", "approved"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlapping) {
    throw new Error(
      `An active leave request already exists for this date range (Status: ${overlapping.status})`
    );
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId: targetEmployeeId,
      leaveTypeId: input.leaveTypeId,
      startDate,
      endDate,
      reason: input.reason,
      status: "pending",
    },
    include: leaveRequestInclude,
  });

  return serializeLeaveRequest(leaveRequest);
}

export async function updateLeaveStatus(
  user: RequestingUser,
  id: string,
  input: UpdateLeaveStatusInput,
) {
  if (user.role !== "ADMIN" && user.role !== "HR" && user.role !== "MANAGER") {
    throw new Error("Only Managers, HR, and Admins can approve or reject leave requests");
  }

  const existing = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      leaveType: true,
      employee: {
        select: {
          id: true,
          userId: true,
          managerId: true,
          user: {
            select: {
              departmentId: true,
            },
          },
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Leave request not found");
  }

  if (existing.status !== "pending") {
    throw new Error(`Leave request is already ${existing.status}`);
  }

  // Managers can only approve their team's requests
  if (user.role === "MANAGER") {
    const managerEmployee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const managedDepartments = await prisma.department.findMany({
      where: { managerId: user.id },
      select: { id: true },
    });
    const managedDeptIds = new Set(managedDepartments.map((d) => d.id));

    const isSubordinate = existing.employee.managerId === managerEmployee?.id;
    const isInManagedDept = existing.employee.user?.departmentId
      ? managedDeptIds.has(existing.employee.user.departmentId)
      : false;

    if (!isSubordinate && !isInManagedDept) {
      throw new Error("You can only review leave requests for your department or subordinates");
    }
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: input.status,
        approvedById: user.id,
        approvedAt: now,
      },
      include: leaveRequestInclude,
    });

    // If approved, synchronize attendance records for all dates in the range
    if (input.status === "approved") {
      const start = new Date(existing.startDate);
      const end = new Date(existing.endDate);
      const current = new Date(start);

      while (current <= end) {
        const dateUtc = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate(), 0, 0, 0, 0));

        await tx.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: existing.employeeId,
              date: dateUtc,
            },
          },
          update: {
            status: "leave",
            notes: `Approved leave: ${existing.leaveType.name}`,
          },
          create: {
            employeeId: existing.employeeId,
            date: dateUtc,
            status: "leave",
            notes: `Approved leave: ${existing.leaveType.name}`,
          },
        });

        current.setUTCDate(current.getUTCDate() + 1);
      }
    }

    return record;
  });

  // Notify the employee whose request was reviewed
  await notify({
    userId: existing.employee.userId,
    title: input.status === "approved" ? "Leave request approved" : "Leave request rejected",
    message: `Your ${existing.leaveType.name} leave request (${existing.startDate.toISOString().slice(0, 10)} to ${existing.endDate.toISOString().slice(0, 10)}) was ${input.status}.`,
    type: "leave",
  });

  return serializeLeaveRequest(updated);
}

export async function cancelLeaveRequest(user: RequestingUser, id: string) {
  const existing = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Leave request not found");
  }

  const isOwner = existing.employee.userId === user.id;
  const isHrOrAdmin = user.role === "ADMIN" || user.role === "HR";

  if (!isOwner && !isHrOrAdmin) {
    throw new Error("You do not have permission to cancel this leave request");
  }

  if (existing.status !== "pending" && !isHrOrAdmin) {
    throw new Error("Only pending leave requests can be cancelled by the employee");
  }

  await prisma.leaveRequest.delete({
    where: { id },
  });

  return { id, cancelled: true };
}

export async function getLeaveStats(
  user: RequestingUser,
  query: LeaveStatsQuery,
) {
  const currentYear = query.year ?? new Date().getFullYear();
  const yearStart = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
  const yearEnd = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 0, 0, 0, 0));

  const whereEmployee: any = { status: "active" };

  if (query.employeeId && (user.role === "ADMIN" || user.role === "HR" || user.role === "MANAGER")) {
    whereEmployee.id = query.employeeId;
  } else if (user.role === "EMPLOYEE") {
    const employee = await resolveEmployeeForUser(user.id);
    whereEmployee.id = employee.id;
  } else if (user.role === "MANAGER" && !query.employeeId) {
    const managerEmployee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    const managedDepartments = await prisma.department.findMany({
      where: { managerId: user.id },
      select: { id: true },
    });
    const departmentIds = managedDepartments.map((d) => d.id);

    whereEmployee.OR = [
      { id: managerEmployee?.id ?? "__none__" },
      { managerId: managerEmployee?.id ?? "__none__" },
      { user: { departmentId: { in: departmentIds } } },
    ];
  }

  const [
    totalPending,
    totalApprovedThisYear,
    totalRejectedThisYear,
    activeOnLeaveToday,
    leaveTypes,
    approvedLeavesThisYear,
  ] = await Promise.all([
    prisma.leaveRequest.count({
      where: {
        status: "pending",
        employee: whereEmployee,
      },
    }),
    prisma.leaveRequest.count({
      where: {
        status: "approved",
        employee: whereEmployee,
        startDate: { gte: yearStart, lte: yearEnd },
      },
    }),
    prisma.leaveRequest.count({
      where: {
        status: "rejected",
        employee: whereEmployee,
        startDate: { gte: yearStart, lte: yearEnd },
      },
    }),
    prisma.leaveRequest.count({
      where: {
        status: "approved",
        startDate: { lte: today },
        endDate: { gte: today },
        employee: whereEmployee,
      },
    }),
    prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "approved",
        employee: whereEmployee,
        startDate: { gte: yearStart, lte: yearEnd },
      },
      select: {
        leaveTypeId: true,
        startDate: true,
        endDate: true,
      },
    }),
  ]);

  // Compute used days per leave type
  const usedDaysMap: Record<string, number> = {};
  for (const leave of approvedLeavesThisYear) {
    const days = calculateDaysBetween(new Date(leave.startDate), new Date(leave.endDate));
    usedDaysMap[leave.leaveTypeId] = (usedDaysMap[leave.leaveTypeId] || 0) + days;
  }

  const balances = leaveTypes.map((type) => {
    const used = usedDaysMap[type.id] || 0;
    const remaining = Math.max(0, type.daysPerYear - used);
    return {
      leaveTypeId: type.id,
      name: type.name,
      daysPerYear: type.daysPerYear,
      isPaid: type.isPaid,
      usedDays: used,
      remainingDays: remaining,
    };
  });

  return {
    year: currentYear,
    totalPending,
    totalApprovedThisYear,
    totalRejectedThisYear,
    activeOnLeaveToday,
    balances,
  };
}
