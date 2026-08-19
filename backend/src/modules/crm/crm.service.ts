import { prisma } from "../../lib/prisma";
import type {
  CreateCustomerInput,
  CreateLeadInput,
  CustomerListQuery,
  LeadListQuery,
  UpdateCustomerInput,
  UpdateLeadInput,
} from "./crm.validation";

type RequestingUser = {
  id: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE" | string;
};

const leadInclude = {
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
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
  convertedToCustomer: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

const customerInclude = {
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
  projects: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  leads: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },
} as const;

function serializeLead(lead: any) {
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    status: lead.status,
    notes: lead.notes,
    assignedToId: lead.assignedToId,
    convertedToCustomerId: lead.convertedToCustomerId,
    createdAt: lead.createdAt ? lead.createdAt.toISOString() : null,
    updatedAt: lead.updatedAt ? lead.updatedAt.toISOString() : null,
    assignedTo: lead.assignedTo
      ? {
          id: lead.assignedTo.id,
          name: lead.assignedTo.name,
          email: lead.assignedTo.email,
          avatarUrl: lead.assignedTo.employee?.avatarUrl || null,
          designation: lead.assignedTo.employee?.designation || null,
        }
      : null,
    convertedToCustomer: lead.convertedToCustomer,
  };
}

function serializeCustomer(customer: any) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    billingAddress: customer.billingAddress,
    shippingAddress: customer.shippingAddress,
    status: customer.status,
    notes: customer.notes,
    assignedToId: customer.assignedToId,
    createdAt: customer.createdAt ? customer.createdAt.toISOString() : null,
    updatedAt: customer.updatedAt ? customer.updatedAt.toISOString() : null,
    assignedTo: customer.assignedTo
      ? {
          id: customer.assignedTo.id,
          name: customer.assignedTo.name,
          email: customer.assignedTo.email,
          avatarUrl: customer.assignedTo.employee?.avatarUrl || null,
        }
      : null,
    projectsCount: customer.projects?.length || 0,
    projects: customer.projects || [],
    leads: customer.leads || [],
  };
}

// ─── LEADS ──────────────────────────────────────────────────────────────────

export async function listLeads(user: RequestingUser, query: LeadListQuery) {
  const where: any = {};

  if (query.status && query.status !== "all") {
    where.status = query.status;
  }

  if (query.assignedToId) {
    where.assignedToId = query.assignedToId;
  }

  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: "insensitive" } },
      { lastName: { contains: query.search, mode: "insensitive" } },
      { company: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: leadInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    leads: leads.map(serializeLead),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getLeadById(id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: leadInclude,
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  return serializeLead(lead);
}

export async function createLead(user: RequestingUser, input: CreateLeadInput) {
  let assignedId = input.assignedToId;
  if (assignedId) {
    const emp = await prisma.employee.findUnique({
      where: { id: assignedId },
      select: { userId: true },
    });
    if (emp) assignedId = emp.userId;
  }

  const lead = await prisma.lead.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      company: input.company,
      status: input.status,
      assignedToId: assignedId || user.id,
      notes: input.notes,
    },
    include: leadInclude,
  });

  return serializeLead(lead);
}

export async function updateLead(id: string, input: UpdateLeadInput) {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) throw new Error("Lead not found");

  let assignedId = input.assignedToId;
  if (assignedId) {
    const emp = await prisma.employee.findUnique({
      where: { id: assignedId },
      select: { userId: true },
    });
    if (emp) assignedId = emp.userId;
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      company: input.company,
      status: input.status,
      assignedToId: input.assignedToId !== undefined ? assignedId : undefined,
      notes: input.notes,
    },
    include: leadInclude,
  });

  return serializeLead(updated);
}

export async function updateLeadStatus(id: string, status: string) {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) throw new Error("Lead not found");

  const updated = await prisma.lead.update({
    where: { id },
    data: { status },
    include: leadInclude,
  });

  return serializeLead(updated);
}

export async function deleteLead(id: string) {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) throw new Error("Lead not found");

  await prisma.lead.delete({ where: { id } });
  return { id, deleted: true };
}

export async function convertLeadToCustomer(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new Error("Lead not found");

  const customerName = `${lead.firstName} ${lead.lastName}${lead.company ? ` (${lead.company})` : ""}`;
  const customerEmail = lead.email || `${lead.firstName.toLowerCase()}.${lead.lastName.toLowerCase()}@example.com`;

  const customer = await prisma.customer.upsert({
    where: { email: customerEmail },
    update: {
      name: customerName,
      phone: lead.phone || undefined,
      assignedToId: lead.assignedToId,
    },
    create: {
      name: customerName,
      email: customerEmail,
      phone: lead.phone,
      status: "active",
      assignedToId: lead.assignedToId,
      notes: lead.notes,
    },
  });

  await prisma.lead.update({
    where: { id },
    data: {
      status: "won",
      convertedToCustomerId: customer.id,
    },
  });

  return {
    success: true,
    customer: serializeCustomer(customer),
  };
}

// ─── CUSTOMERS ──────────────────────────────────────────────────────────────

export async function listCustomers(user: RequestingUser, query: CustomerListQuery) {
  const where: any = {};

  if (query.status && query.status !== "all") {
    where.status = query.status;
  }

  if (query.assignedToId) {
    where.assignedToId = query.assignedToId;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: customerInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers: customers.map(serializeCustomer),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: customerInclude,
  });

  if (!customer) throw new Error("Customer not found");
  return serializeCustomer(customer);
}

export async function createCustomer(user: RequestingUser, input: CreateCustomerInput) {
  let assignedId = input.assignedToId;
  if (assignedId) {
    const emp = await prisma.employee.findUnique({
      where: { id: assignedId },
      select: { userId: true },
    });
    if (emp) assignedId = emp.userId;
  }

  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      billingAddress: input.billingAddress,
      shippingAddress: input.shippingAddress,
      status: input.status,
      assignedToId: assignedId || user.id,
      notes: input.notes,
    },
    include: customerInclude,
  });

  return serializeCustomer(customer);
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new Error("Customer not found");

  let assignedId = input.assignedToId;
  if (assignedId) {
    const emp = await prisma.employee.findUnique({
      where: { id: assignedId },
      select: { userId: true },
    });
    if (emp) assignedId = emp.userId;
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      billingAddress: input.billingAddress,
      shippingAddress: input.shippingAddress,
      status: input.status,
      assignedToId: input.assignedToId !== undefined ? assignedId : undefined,
      notes: input.notes,
    },
    include: customerInclude,
  });

  return serializeCustomer(updated);
}

export async function deleteCustomer(id: string) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new Error("Customer not found");

  await prisma.customer.delete({ where: { id } });
  return { id, deleted: true };
}

export async function getCRMStats() {
  const [
    totalLeads,
    newLeads,
    contactedLeads,
    qualifiedLeads,
    wonLeads,
    lostLeads,
    totalCustomers,
    activeCustomers,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "new" } }),
    prisma.lead.count({ where: { status: "contacted" } }),
    prisma.lead.count({ where: { status: "qualified" } }),
    prisma.lead.count({ where: { status: "won" } }),
    prisma.lead.count({ where: { status: "lost" } }),
    prisma.customer.count(),
    prisma.customer.count({ where: { status: "active" } }),
  ]);

  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  return {
    totalLeads,
    newLeads,
    contactedLeads,
    qualifiedLeads,
    wonLeads,
    lostLeads,
    totalCustomers,
    activeCustomers,
    conversionRate,
  };
}
