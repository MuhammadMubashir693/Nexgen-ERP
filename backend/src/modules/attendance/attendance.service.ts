import { prisma } from "../../lib/prisma";
import type {
  AttendanceListQuery,
  AttendanceStatsQuery,
  BulkMarkAttendanceInput,
  CheckInInput,
  CheckOutInput,
  ManualAttendanceInput,
  UpdateAttendanceInput,
} from "./attendance.validation";

type RequestingUser = {
  id: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE" | string;
};

const attendanceInclude = {
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
} as const;

function serializeAttendance(record: any) {
  return {
    id: record.id,
    employeeId: record.employeeId,
    date: record.date instanceof Date ? record.date.toISOString().slice(0, 10) : record.date,
    checkIn: record.checkIn ? record.checkIn.toISOString() : null,
    checkOut: record.checkOut ? record.checkOut.toISOString() : null,
    workHours: record.workHours ? Number(record.workHours) : null,
    status: record.status,
    notes: record.notes,
    createdAt: record.createdAt,
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
  };
}

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function getTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
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

export async function getTodayAttendance(user: RequestingUser) {
  const employee = await resolveEmployeeForUser(user.id);
  const today = getTodayUtc();

  const record = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: today,
      },
    },
    include: attendanceInclude,
  });

  if (!record) {
    return {
      hasCheckedIn: false,
      hasCheckedOut: false,
      attendance: null,
    };
  }

  return {
    hasCheckedIn: Boolean(record.checkIn),
    hasCheckedOut: Boolean(record.checkOut),
    attendance: serializeAttendance(record),
  };
}

export async function checkIn(user: RequestingUser, input: CheckInInput) {
  let targetEmployeeId: string;

  if (input.employeeId && (user.role === "ADMIN" || user.role === "HR")) {
    targetEmployeeId = input.employeeId;
  } else {
    const employee = await resolveEmployeeForUser(user.id);
    targetEmployeeId = employee.id;
  }

  const checkInTime = input.timestamp ? new Date(input.timestamp) : new Date();
  const today = new Date(Date.UTC(checkInTime.getUTCFullYear(), checkInTime.getUTCMonth(), checkInTime.getUTCDate(), 0, 0, 0, 0));

  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: targetEmployeeId,
        date: today,
      },
    },
  });

  if (existing && existing.checkIn) {
    throw new Error("Attendance already checked in for today");
  }

  // Determine status: Late if checked in after 09:30 local/UTC relative time
  const hours = checkInTime.getHours();
  const minutes = checkInTime.getMinutes();
  const isLate = hours > 9 || (hours === 9 && minutes > 30);
  const status = existing?.status === "leave" ? "leave" : isLate ? "late" : "present";

  const record = await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId: targetEmployeeId,
        date: today,
      },
    },
    update: {
      checkIn: checkInTime,
      status,
      notes: input.notes ?? undefined,
    },
    create: {
      employeeId: targetEmployeeId,
      date: today,
      checkIn: checkInTime,
      status,
      notes: input.notes ?? undefined,
    },
    include: attendanceInclude,
  });

  return serializeAttendance(record);
}

export async function checkOut(user: RequestingUser, input: CheckOutInput) {
  let targetEmployeeId: string;

  if (input.employeeId && (user.role === "ADMIN" || user.role === "HR")) {
    targetEmployeeId = input.employeeId;
  } else {
    const employee = await resolveEmployeeForUser(user.id);
    targetEmployeeId = employee.id;
  }

  const checkOutTime = input.timestamp ? new Date(input.timestamp) : new Date();
  const today = new Date(Date.UTC(checkOutTime.getUTCFullYear(), checkOutTime.getUTCMonth(), checkOutTime.getUTCDate(), 0, 0, 0, 0));

  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: targetEmployeeId,
        date: today,
      },
    },
  });

  if (!existing || !existing.checkIn) {
    throw new Error("Cannot check out without checking in first");
  }

  if (existing.checkOut) {
    throw new Error("Attendance already checked out for today");
  }

  // Calculate work hours
  const diffMs = checkOutTime.getTime() - existing.checkIn.getTime();
  const hours = Math.max(0, diffMs / (1000 * 60 * 60));
  const workHours = Math.round(hours * 100) / 100;

  // If work hours < 4 and not leave, mark as half_day
  let status = existing.status;
  if (status !== "leave" && workHours < 4 && workHours > 0) {
    status = "half_day";
  }

  const record = await prisma.attendance.update({
    where: {
      employeeId_date: {
        employeeId: targetEmployeeId,
        date: today,
      },
    },
    data: {
      checkOut: checkOutTime,
      workHours,
      status,
      notes: input.notes ?? undefined,
    },
    include: attendanceInclude,
  });

  return serializeAttendance(record);
}

export async function recordManualAttendance(
  user: RequestingUser,
  input: ManualAttendanceInput,
) {
  if (user.role !== "ADMIN" && user.role !== "HR") {
    throw new Error("Only HR and Admin can record manual attendance");
  }

  const date = parseDateOnly(input.date);
  const checkIn = input.checkIn ? new Date(input.checkIn) : null;
  const checkOut = input.checkOut ? new Date(input.checkOut) : null;

  let workHours = input.workHours;
  if (workHours == null && checkIn && checkOut) {
    const diffMs = checkOut.getTime() - checkIn.getTime();
    workHours = Math.round(Math.max(0, diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  const record = await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId: input.employeeId,
        date,
      },
    },
    update: {
      checkIn,
      checkOut,
      workHours,
      status: input.status,
      notes: input.notes ?? undefined,
    },
    create: {
      employeeId: input.employeeId,
      date,
      checkIn,
      checkOut,
      workHours,
      status: input.status,
      notes: input.notes ?? undefined,
    },
    include: attendanceInclude,
  });

  return serializeAttendance(record);
}

export async function updateAttendanceRecord(
  user: RequestingUser,
  id: string,
  input: UpdateAttendanceInput,
) {
  if (user.role !== "ADMIN" && user.role !== "HR") {
    throw new Error("Only HR and Admin can update attendance records");
  }

  const existing = await prisma.attendance.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Attendance record not found");
  }

  const checkIn = input.checkIn !== undefined ? (input.checkIn ? new Date(input.checkIn) : null) : existing.checkIn;
  const checkOut = input.checkOut !== undefined ? (input.checkOut ? new Date(input.checkOut) : null) : existing.checkOut;

  let workHours = input.workHours !== undefined ? input.workHours : existing.workHours ? Number(existing.workHours) : null;
  if (input.workHours === undefined && checkIn && checkOut) {
    const diffMs = checkOut.getTime() - checkIn.getTime();
    workHours = Math.round(Math.max(0, diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  const date = input.date ? parseDateOnly(input.date) : existing.date;

  const record = await prisma.attendance.update({
    where: { id },
    data: {
      date,
      checkIn,
      checkOut,
      workHours,
      status: input.status ?? existing.status,
      notes: input.notes !== undefined ? input.notes : existing.notes,
    },
    include: attendanceInclude,
  });

  return serializeAttendance(record);
}

export async function deleteAttendanceRecord(user: RequestingUser, id: string) {
  if (user.role !== "ADMIN" && user.role !== "HR") {
    throw new Error("Only HR and Admin can delete attendance records");
  }

  const existing = await prisma.attendance.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Attendance record not found");
  }

  await prisma.attendance.delete({
    where: { id },
  });

  return { id, deleted: true };
}

export async function listAttendance(
  user: RequestingUser,
  query: AttendanceListQuery,
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

  if (query.date) {
    where.date = parseDateOnly(query.date);
  } else if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = parseDateOnly(query.startDate);
    if (query.endDate) where.date.lte = parseDateOnly(query.endDate);
  }

  if (query.status && query.status !== "all") {
    where.status = query.status;
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
    prisma.attendance.findMany({
      where,
      include: attendanceInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip,
      take: query.limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  return {
    records: records.map(serializeAttendance),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getAttendanceStats(
  user: RequestingUser,
  query: AttendanceStatsQuery,
) {
  const targetDate = query.date ? parseDateOnly(query.date) : getTodayUtc();

  const whereEmployee: any = { status: "active" };

  if (query.departmentId && (user.role === "ADMIN" || user.role === "HR")) {
    whereEmployee.user = { departmentId: query.departmentId };
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

    whereEmployee.OR = [
      { id: managerEmployee?.id ?? "__none__" },
      { managerId: managerEmployee?.id ?? "__none__" },
      { user: { departmentId: { in: departmentIds } } },
    ];
  } else if (user.role === "EMPLOYEE") {
    const employee = await resolveEmployeeForUser(user.id);
    whereEmployee.id = employee.id;
  }

  const [totalEmployees, attendanceRecords] = await Promise.all([
    prisma.employee.count({ where: whereEmployee }),
    prisma.attendance.findMany({
      where: {
        date: targetDate,
        employee: whereEmployee,
      },
      select: {
        status: true,
        workHours: true,
      },
    }),
  ]);

  let present = 0;
  let late = 0;
  let halfDay = 0;
  let onLeave = 0;
  let totalHours = 0;
  let hoursCount = 0;

  for (const rec of attendanceRecords) {
    if (rec.status === "present") present++;
    else if (rec.status === "late") {
      late++;
      present++; // Late is still counted in total present
    } else if (rec.status === "half_day") {
      halfDay++;
      present++;
    } else if (rec.status === "leave") {
      onLeave++;
    }

    if (rec.workHours) {
      totalHours += Number(rec.workHours);
      hoursCount++;
    }
  }

  const recordedCount = attendanceRecords.length;
  const absent = Math.max(0, totalEmployees - present - onLeave);
  const attendanceRate = totalEmployees > 0 ? Math.round((present / totalEmployees) * 1000) / 10 : 0;
  const avgWorkHours = hoursCount > 0 ? Math.round((totalHours / hoursCount) * 10) / 10 : 0;

  return {
    date: targetDate.toISOString().slice(0, 10),
    totalEmployees,
    present,
    late,
    absent,
    halfDay,
    onLeave,
    attendanceRate,
    avgWorkHours,
  };
}

export async function bulkMarkAttendance(
  user: RequestingUser,
  input: BulkMarkAttendanceInput,
) {
  if (user.role !== "ADMIN" && user.role !== "HR") {
    throw new Error("Only HR and Admin can bulk mark attendance");
  }

  const results = await prisma.$transaction(
    input.records.map((rec) => {
      const date = parseDateOnly(rec.date);
      return prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: rec.employeeId,
            date,
          },
        },
        update: {
          status: rec.status,
          notes: rec.notes ?? undefined,
        },
        create: {
          employeeId: rec.employeeId,
          date,
          status: rec.status,
          notes: rec.notes ?? undefined,
        },
      });
    })
  );

  return {
    success: true,
    count: results.length,
  };
}
