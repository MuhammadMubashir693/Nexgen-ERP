// prisma/seed.ts
// Seeds enough data to demo every MVP module: auth (via Supabase), HR,
// attendance, leave, CRM, and projects/tasks.
//
// Auth users are created through the Supabase Admin API (requires the
// SERVICE ROLE key — never expose this to the frontend). The matching
// profile row in public."User" is then upserted with the SAME id.
//
// Safe to re-run: getOrCreateAuthUser reuses an existing auth user by
// email instead of erroring, and all Prisma writes use upsert.

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});
const prisma = new PrismaClient({ adapter });

// Service-role client — full admin rights, backend-only, never ship this key to the frontend
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Creates a Supabase auth user if one doesn't already exist for this email,
 * otherwise returns the existing user. Returns the auth user's id (UUID),
 * which must be reused as the primary key for the public."User" profile row.
 */
async function getOrCreateAuthUser(email: string, password: string) {
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification for seeded/demo accounts
  });

  if (!error) {
    return created.user.id;
  }

  // Already exists — look it up instead of failing the whole seed run
  if (error.message.toLowerCase().includes("already been registered")) {
    let page = 1;
    const perPage = 200;
    while (true) {
      const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (listError) throw listError;
      const match = data.users.find((u) => u.email === email);
      if (match) return match.id;
      if (data.users.length < perPage) break; // no more pages
      page++;
    }
    throw new Error(`Could not find existing auth user for ${email}`);
  }

  throw error;
}

async function main() {
  console.log("Seeding...");

  // ---------- Departments (created first, manager linked after users exist) ----------
  const engineering = await prisma.department.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", description: "Product & engineering team" },
  });

  const salesDept = await prisma.department.upsert({
    where: { name: "Sales" },
    update: {},
    create: { name: "Sales", description: "Sales & customer relations" },
  });

  const hrDept = await prisma.department.upsert({
    where: { name: "Human Resources" },
    update: {},
    create: { name: "Human Resources", description: "People operations" },
  });

  // ---------- Auth users + profiles ----------
  const defaultPassword = "Password123!";

  async function seedUser(params: {
    email: string;
    name: string;
    role: Role;
    departmentId?: string;
    themeAccent: string;
  }) {
    const authId = await getOrCreateAuthUser(params.email, defaultPassword);
    return prisma.user.upsert({
      where: { id: authId },
      update: {},
      create: {
        id: authId,
        name: params.name,
        email: params.email,
        role: params.role,
        departmentId: params.departmentId,
        themeAccent: params.themeAccent,
      },
    });
  }

  const admin = await seedUser({
    email: "admin@erp.test",
    name: "Ayesha Admin",
    role: Role.ADMIN,
    themeAccent: "blue",
  });

  const hrUser = await seedUser({
    email: "hr@erp.test",
    name: "Hina HR",
    role: Role.HR,
    departmentId: hrDept.id,
    themeAccent: "purple",
  });

  const manager = await seedUser({
    email: "manager@erp.test",
    name: "Mohsin Manager",
    role: Role.MANAGER,
    departmentId: engineering.id,
    themeAccent: "green",
  });

  const employeeUser1 = await seedUser({
    email: "employee1@erp.test",
    name: "Ali Employee",
    role: Role.EMPLOYEE,
    departmentId: engineering.id,
    themeAccent: "orange",
  });

  const employeeUser2 = await seedUser({
    email: "employee2@erp.test",
    name: "Sara Employee",
    role: Role.EMPLOYEE,
    departmentId: salesDept.id,
    themeAccent: "red",
  });

  // Link department managers now that the users exist
  await prisma.department.update({
    where: { id: engineering.id },
    data: { managerId: manager.id },
  });
  await prisma.department.update({
    where: { id: hrDept.id },
    data: { managerId: hrUser.id },
  });

  // ---------- Employees ----------
  const managerEmployee = await prisma.employee.upsert({
    where: { userId: manager.id },
    update: {},
    create: {
      userId: manager.id,
      employeeCode: "EMP-001",
      firstName: "Mohsin",
      lastName: "Manager",
      designation: "Engineering Manager",
      gender: "male",
      dateOfJoining: new Date("2023-01-15"),
      employmentType: "full_time",
      basicSalary: 250000,
      status: "active",
    },
  });

  const employee1 = await prisma.employee.upsert({
    where: { userId: employeeUser1.id },
    update: {},
    create: {
      userId: employeeUser1.id,
      employeeCode: "EMP-002",
      firstName: "Ali",
      lastName: "Employee",
      designation: "Software Engineer",
      gender: "male",
      dateOfJoining: new Date("2024-03-01"),
      employmentType: "full_time",
      basicSalary: 150000,
      managerId: managerEmployee.id,
      status: "active",
    },
  });

  const employee2 = await prisma.employee.upsert({
    where: { userId: employeeUser2.id },
    update: {},
    create: {
      userId: employeeUser2.id,
      employeeCode: "EMP-003",
      firstName: "Sara",
      lastName: "Employee",
      designation: "Sales Executive",
      gender: "female",
      dateOfJoining: new Date("2024-06-10"),
      employmentType: "full_time",
      basicSalary: 120000,
      status: "active",
    },
  });

  const adminEmployee = await prisma.employee.upsert({
  where: { userId: admin.id },
  update: {},
  create: {
    userId: admin.id,
    employeeCode: "EMP-005",
    firstName: "Ayesha",
    lastName: "Admin",
    designation: "System Administrator",
    employmentType: "full_time",
    basicSalary: 0,
    status: "active",
  },
});

const hrEmployee = await prisma.employee.upsert({
  where: { userId: hrUser.id },
  update: {},
  create: {
    userId: hrUser.id,
    employeeCode: "EMP-006",
    firstName: "Hina",
    lastName: "HR",
    designation: "HR Manager",
    employmentType: "full_time",
    basicSalary: 0,
    status: "active",
  },
});

  // ---------- Leave types ----------
  const [sickLeave] = await Promise.all([
    prisma.leaveType.upsert({
      where: { name: "Sick" },
      update: {},
      create: { name: "Sick", daysPerYear: 10, isPaid: true },
    }),
    prisma.leaveType.upsert({
      where: { name: "Casual" },
      update: {},
      create: { name: "Casual", daysPerYear: 8, isPaid: true },
    }),
    prisma.leaveType.upsert({
      where: { name: "Annual" },
      update: {},
      create: { name: "Annual", daysPerYear: 14, isPaid: true },
    }),
  ]);

  // ---------- Attendance (last 3 days for employee1) ----------
  for (let i = 0; i < 3; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const checkIn = new Date(date);
    checkIn.setHours(9, 0, 0, 0);
    const checkOut = new Date(date);
    checkOut.setHours(18, 0, 0, 0);

    await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: employee1.id, date } },
      update: {},
      create: {
        employeeId: employee1.id,
        date,
        checkIn,
        checkOut,
        workHours: 9,
        status: "present",
      },
    });
  }

  // ---------- Leave request ----------
  await prisma.leaveRequest.create({
    data: {
      employeeId: employee1.id,
      leaveTypeId: sickLeave.id,
      startDate: new Date("2026-08-20"),
      endDate: new Date("2026-08-21"),
      reason: "Flu",
      status: "pending",
    },
  });

  // ---------- CRM: customers & leads ----------
  const customer = await prisma.customer.upsert({
    where: { email: "contact@acmecorp.test" },
    update: {},
    create: {
      name: "Acme Corp",
      email: "contact@acmecorp.test",
      phone: "+92-300-1234567",
      status: "active",
      assignedToId: employeeUser2.id,
    },
  });

  await prisma.lead.create({
    data: {
      firstName: "Bilal",
      lastName: "Khan",
      email: "bilal@newbiz.test",
      company: "NewBiz Ltd",
      status: "new",
      assignedToId: employeeUser2.id,
      notes: "Interested in enterprise plan, follow up next week.",
    },
  });

  // ---------- Project & tasks ----------
  const project = await prisma.project.create({
    data: {
      name: "Acme ERP Rollout",
      description: "Implement the ERP system for Acme Corp",
      customerId: customer.id,
      status: "active",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-09-30"),
      createdById: admin.id,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        projectId: project.id,
        title: "Set up auth module",
        assignedToId: employeeUser1.id,
        status: "done",
        priority: "high",
        dueDate: new Date("2026-08-05"),
      },
      {
        projectId: project.id,
        title: "Build employee dashboard",
        assignedToId: employeeUser1.id,
        status: "in_progress",
        priority: "medium",
        dueDate: new Date("2026-08-15"),
      },
      {
        projectId: project.id,
        title: "Client demo prep",
        assignedToId: employeeUser2.id,
        status: "todo",
        priority: "medium",
        dueDate: new Date("2026-08-25"),
      },
    ],
  });

  // ---------- Notification ----------
  await prisma.notification.create({
    data: {
      userId: employeeUser1.id,
      title: "Welcome to the ERP system",
      message: "Your account has been set up. Please review your assigned tasks.",
      type: "system",
    },
  });

  // ---------- Activity log ----------
  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: "created",
      entityType: "project",
      entityId: project.id,
      newValues: { name: project.name, status: project.status },
    },
  });

  console.log("Seed complete.");
  console.log("Login with any of (Supabase Auth):");
  console.log("  admin@erp.test / Password123!");
  console.log("  hr@erp.test / Password123!");
  console.log("  manager@erp.test / Password123!");
  console.log("  employee1@erp.test / Password123!");
  console.log("  employee2@erp.test / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
