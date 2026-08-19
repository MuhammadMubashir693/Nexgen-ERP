import { prisma } from "../../lib/prisma";

type RequestingUser = {
  id: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE" | string;
};

export interface ComputedSalary {
  employeeId: string;
  employeeCode: string;
  name: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  departmentId: string | null;
  employmentType: string;
  avatarUrl: string | null;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  totalAllowance: number;
  grossSalary: number;
  taxDeduction: number;
  pensionDeduction: number;
  totalDeductions: number;
  netSalary: number;
}

export interface GeneratePayrollInput {
  scope: "all" | "department" | "employee";
  departmentId?: string;
  employeeId?: string;
  month: number; // 1-12
  year: number;
  bonusPercentage?: number;
  deductionAdjustment?: number;
  notes?: string;
}

export interface PayrollBatchItem {
  employeeId: string;
  employeeCode: string;
  name: string;
  designation: string;
  department: string;
  basicSalary: number;
  allowance: number;
  bonus: number;
  grossSalary: number;
  taxDeduction: number;
  pensionDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
}

export interface PayrollBatchResult {
  batchId: string;
  payPeriod: string;
  scope: string;
  targetName: string;
  processedAt: string;
  processedBy: string;
  notes: string | null;
  itemCount: number;
  totalBasic: number;
  totalAllowance: number;
  totalBonus: number;
  totalGross: number;
  totalTax: number;
  totalPension: number;
  totalDeductions: number;
  totalNet: number;
  items: PayrollBatchItem[];
}

export function computeSalaryBreakdown(employee: any): ComputedSalary {
  const basic = Number(employee.basicSalary || 0);
  const isManagement =
    employee.designation?.toLowerCase().includes("manager") ||
    employee.designation?.toLowerCase().includes("director") ||
    employee.designation?.toLowerCase().includes("admin");

  const allowanceRate = isManagement ? 0.35 : 0.25;
  const housing = Math.round(basic * (allowanceRate * 0.6) * 100) / 100;
  const transport = Math.round(basic * (allowanceRate * 0.4) * 100) / 100;
  const totalAllowance = housing + transport;
  const gross = basic + totalAllowance;

  // Progressive tax
  const taxRate = gross > 200000 ? 0.12 : gross > 100000 ? 0.08 : gross > 50000 ? 0.05 : 0.02;
  const taxDeduction = Math.round(gross * taxRate * 100) / 100;
  const pensionDeduction = Math.round(basic * 0.05 * 100) / 100;
  const totalDeductions = taxDeduction + pensionDeduction;
  const netSalary = Math.round((gross - totalDeductions) * 100) / 100;

  return {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    name: `${employee.firstName} ${employee.lastName}`.trim(),
    firstName: employee.firstName,
    lastName: employee.lastName,
    designation: employee.designation || "Staff",
    department: employee.user?.department?.name || "General",
    departmentId: employee.user?.department?.id || null,
    employmentType: employee.employmentType || "full_time",
    avatarUrl: employee.avatarUrl,
    basicSalary: basic,
    housingAllowance: housing,
    transportAllowance: transport,
    totalAllowance,
    grossSalary: gross,
    taxDeduction,
    pensionDeduction,
    totalDeductions,
    netSalary,
  };
}

export async function getPayrollSummary(user: RequestingUser) {
  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    include: {
      user: {
        include: {
          department: true,
        },
      },
    },
  });

  const computedList = employees.map(computeSalaryBreakdown);

  let totalGross = 0;
  let totalNet = 0;
  let totalTax = 0;
  let totalDeductions = 0;
  const deptMap: Record<string, { departmentName: string; employeeCount: number; totalGross: number; totalNet: number }> = {};

  for (const emp of computedList) {
    totalGross += emp.grossSalary;
    totalNet += emp.netSalary;
    totalTax += emp.taxDeduction;
    totalDeductions += emp.totalDeductions;

    if (!deptMap[emp.department]) {
      deptMap[emp.department] = {
        departmentName: emp.department,
        employeeCount: 0,
        totalGross: 0,
        totalNet: 0,
      };
    }
    deptMap[emp.department].employeeCount++;
    deptMap[emp.department].totalGross += emp.grossSalary;
    deptMap[emp.department].totalNet += emp.netSalary;
  }

  const averageSalary = employees.length > 0 ? Math.round(totalGross / employees.length) : 0;

  // Generate 12-month trend simulation based on current base
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthIdx = new Date().getMonth();
  const monthlyTrend = months.map((month, idx) => {
    const factor = 1 - (11 - idx) * 0.015;
    const gross = Math.round(totalGross * factor);
    const net = Math.round(totalNet * factor);
    const tax = Math.round(totalTax * factor);
    return {
      month,
      grossSalary: gross,
      netSalary: net,
      tax,
      isCurrent: idx === currentMonthIdx,
    };
  });

  return {
    totalEmployees: employees.length,
    totalGrossPayroll: Math.round(totalGross * 100) / 100,
    totalNetPayroll: Math.round(totalNet * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    averageSalary,
    departments: Object.values(deptMap),
    monthlyTrend,
  };
}

export async function listPayrollEmployees(
  user: RequestingUser,
  query: {
    search?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
  },
) {
  const page = query.page || 1;
  const limit = query.limit || 20;

  const where: any = { status: "active" };

  if (query.departmentId) {
    where.user = { departmentId: query.departmentId };
  }

  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: "insensitive" } },
      { lastName: { contains: query.search, mode: "insensitive" } },
      { employeeCode: { contains: query.search, mode: "insensitive" } },
      { designation: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (user.role === "EMPLOYEE") {
    where.userId = user.id;
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        user: {
          include: {
            department: true,
          },
        },
      },
      orderBy: { basicSalary: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.employee.count({ where }),
  ]);

  const items = employees.map(computeSalaryBreakdown);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getEmployeePayslip(
  user: RequestingUser,
  employeeId?: string,
) {
  let targetId = employeeId;

  if (!targetId || user.role === "EMPLOYEE") {
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!employee) throw new Error("Employee record not found");
    targetId = employee.id;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: targetId },
    include: {
      user: {
        include: {
          department: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  const salary = computeSalaryBreakdown(employee);
  const now = new Date();
  const payPeriod = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const payDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    payslipNumber: `PAY-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}-${employee.employeeCode}`,
    payPeriod,
    payDate,
    employee: {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      employeeCode: employee.employeeCode,
      email: employee.user.email,
      designation: employee.designation || "Staff",
      department: employee.user.department?.name || "General",
      dateOfJoining: employee.dateOfJoining ? employee.dateOfJoining.toISOString().slice(0, 10) : null,
      employmentType: employee.employmentType,
    },
    earnings: [
      { description: "Basic Salary", amount: salary.basicSalary },
      { description: "Housing Allowance", amount: salary.housingAllowance },
      { description: "Transport Allowance", amount: salary.transportAllowance },
    ],
    deductions: [
      { description: "PAYE Income Tax", amount: salary.taxDeduction },
      { description: "Pension Contribution (5%)", amount: salary.pensionDeduction },
    ],
    totals: {
      grossEarnings: salary.grossSalary,
      totalDeductions: salary.totalDeductions,
      netPay: salary.netSalary,
    },
  };
}

export async function generatePayrollBatch(
  user: RequestingUser,
  input: GeneratePayrollInput,
): Promise<PayrollBatchResult> {
  const where: any = { status: "active" };
  let targetName = "All Company Staff";

  if (input.scope === "department" && input.departmentId) {
    where.user = { departmentId: input.departmentId };
    const dept = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { name: true },
    });
    if (dept) targetName = `${dept.name} Department`;
  } else if (input.scope === "employee" && input.employeeId) {
    where.id = input.employeeId;
    const emp = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: { firstName: true, lastName: true },
    });
    if (emp) targetName = `${emp.firstName} ${emp.lastName}`;
  }

  const employees = await prisma.employee.findMany({
    where,
    include: {
      user: {
        include: {
          department: true,
        },
      },
    },
    orderBy: { firstName: "asc" },
  });

  if (employees.length === 0) {
    throw new Error("No active employees found for the selected payroll scope");
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthName = monthNames[input.month - 1] || "Month";
  const payPeriod = `${monthName} ${input.year}`;

  const bonusPct = Number(input.bonusPercentage || 0);
  const deductionAdj = Number(input.deductionAdjustment || 0);

  let totalBasic = 0;
  let totalAllowance = 0;
  let totalBonus = 0;
  let totalGross = 0;
  let totalTax = 0;
  let totalPension = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  const items: PayrollBatchItem[] = employees.map((emp) => {
    const baseCalc = computeSalaryBreakdown(emp);
    const bonus = bonusPct > 0 ? Math.round(baseCalc.basicSalary * (bonusPct / 100) * 100) / 100 : 0;
    const gross = baseCalc.grossSalary + bonus;
    const tax = Math.round(gross * (gross > 200000 ? 0.12 : gross > 100000 ? 0.08 : gross > 50000 ? 0.05 : 0.02) * 100) / 100;
    const pension = baseCalc.pensionDeduction;
    const otherDeductions = deductionAdj;
    const deductions = tax + pension + otherDeductions;
    const net = Math.round((gross - deductions) * 100) / 100;

    totalBasic += baseCalc.basicSalary;
    totalAllowance += baseCalc.totalAllowance;
    totalBonus += bonus;
    totalGross += gross;
    totalTax += tax;
    totalPension += pension;
    totalDeductions += deductions;
    totalNet += net;

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      designation: emp.designation || "Staff",
      department: emp.user?.department?.name || "General",
      basicSalary: baseCalc.basicSalary,
      allowance: baseCalc.totalAllowance,
      bonus,
      grossSalary: gross,
      taxDeduction: tax,
      pensionDeduction: pension,
      otherDeductions,
      totalDeductions: deductions,
      netSalary: net,
    };
  });

  const batchCode = `PAY-${input.year}${(input.month).toString().padStart(2, "0")}-${input.scope.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Log in activity log
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "created",
      entityType: "payroll_batch",
      entityId: batchCode,
      newValues: {
        batchCode,
        payPeriod,
        itemCount: items.length,
        totalNet: Math.round(totalNet * 100) / 100,
      },
    },
  }).catch(() => {});

  return {
    batchId: batchCode,
    payPeriod,
    scope: input.scope,
    targetName,
    processedAt: new Date().toISOString(),
    processedBy: user.id,
    notes: input.notes || null,
    itemCount: items.length,
    totalBasic: Math.round(totalBasic * 100) / 100,
    totalAllowance: Math.round(totalAllowance * 100) / 100,
    totalBonus: Math.round(totalBonus * 100) / 100,
    totalGross: Math.round(totalGross * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalPension: Math.round(totalPension * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    totalNet: Math.round(totalNet * 100) / 100,
    items,
  };
}
