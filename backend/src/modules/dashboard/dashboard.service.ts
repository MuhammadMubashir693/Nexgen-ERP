import { prisma } from "../../lib/prisma";

type RequestingUser = {
  id: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE" | string;
};

export async function getDashboardOverview(user: RequestingUser) {
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // 1. Employees & Departments
  const [totalEmployees, activeEmployees, totalDepartments, departments] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: "active" } }),
    prisma.department.count({ where: { isActive: true } }),
    prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: {
          select: { users: true },
        },
      },
    }),
  ]);

  // 2. Today's Attendance
  const todayAttendance = await prisma.attendance.findMany({
    where: { date: todayDateOnly },
  });

  const presentToday = todayAttendance.filter((a) => a.status === "present" || a.status === "late" || a.status === "half_day").length;
  const lateToday = todayAttendance.filter((a) => a.status === "late").length;
  const onLeaveToday = todayAttendance.filter((a) => a.status === "leave").length;
  const absentToday = Math.max(0, activeEmployees - (presentToday + onLeaveToday));
  const attendanceRate = activeEmployees > 0 ? Math.round((presentToday / activeEmployees) * 100) : 0;

  // 3. Payroll summary estimation
  const allActiveEmployees = await prisma.employee.findMany({
    where: { status: "active" },
    select: { basicSalary: true, designation: true },
  });

  let totalGrossPayroll = 0;
  let totalNetPayroll = 0;
  for (const emp of allActiveEmployees) {
    const basic = Number(emp.basicSalary || 0);
    const isMgmt = emp.designation?.toLowerCase().includes("manager") || emp.designation?.toLowerCase().includes("director");
    const allowance = Math.round(basic * (isMgmt ? 0.35 : 0.25));
    const gross = basic + allowance;
    const tax = Math.round(gross * (gross > 100000 ? 0.08 : 0.04));
    const pension = Math.round(basic * 0.05);
    const net = gross - (tax + pension);
    totalGrossPayroll += gross;
    totalNetPayroll += net;
  }

  // 4. Projects & Tasks
  const [totalProjects, activeProjects, completedProjects, totalTasks, doneTasks, inProgressTasks] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: "active" } }),
    prisma.project.count({ where: { status: "completed" } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "done" } }),
    prisma.task.count({ where: { status: "in_progress" } }),
  ]);

  const taskCompletionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // 5. CRM Stats
  const [totalLeads, wonLeads, totalCustomers, activeCustomers] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "won" } }),
    prisma.customer.count(),
    prisma.customer.count({ where: { status: "active" } }),
  ]);

  const crmConversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // 6. Recent Activity Logs
  const recentLogs = await prisma.activityLog.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          employee: {
            select: { avatarUrl: true },
          },
        },
      },
    },
  });

  const activityStream = recentLogs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    timestamp: log.createdAt.toISOString(),
    userName: log.user?.name || "System",
    userRole: log.user?.role || "SYSTEM",
    avatarUrl: log.user?.employee?.avatarUrl || null,
  }));

  // 7. Simulated 7-day attendance trend
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyAttendance = dayNames.map((day, i) => {
    const isPastOrToday = i <= (today.getDay() === 0 ? 6 : today.getDay() - 1);
    const present = isPastOrToday ? Math.max(0, Math.round(activeEmployees * (0.85 + (i % 3) * 0.04))) : 0;
    const leave = isPastOrToday ? Math.round(activeEmployees * 0.06) : 0;
    const absent = isPastOrToday ? Math.max(0, activeEmployees - (present + leave)) : 0;
    return {
      day,
      present,
      leave,
      absent,
    };
  });

  return {
    metrics: {
      staff: {
        total: totalEmployees,
        active: activeEmployees,
        departmentsCount: totalDepartments,
      },
      attendance: {
        present: presentToday,
        late: lateToday,
        onLeave: onLeaveToday,
        absent: absentToday,
        rate: attendanceRate,
      },
      payroll: {
        totalGross: Math.round(totalGrossPayroll * 100) / 100,
        totalNet: Math.round(totalNetPayroll * 100) / 100,
        avgSalary: activeEmployees > 0 ? Math.round(totalGrossPayroll / activeEmployees) : 0,
      },
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        totalTasks,
        inProgressTasks,
        doneTasks,
        completionRate: taskCompletionRate,
      },
      crm: {
        totalLeads,
        wonLeads,
        totalCustomers,
        activeCustomers,
        conversionRate: crmConversionRate,
      },
    },
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      staffCount: d._count.users,
    })),
    weeklyAttendance,
    activityStream,
  };
}
