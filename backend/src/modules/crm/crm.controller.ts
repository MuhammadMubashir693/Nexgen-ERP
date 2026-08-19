import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import {
  createCustomerSchema,
  createLeadSchema,
  crmIdParamSchema,
  customerListQuerySchema,
  leadListQuerySchema,
  updateCustomerSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
} from "./crm.validation";
import {
  convertLeadToCustomer,
  createCustomer,
  createLead,
  deleteCustomer,
  deleteLead,
  getCRMStats,
  getCustomerById,
  getLeadById,
  listCustomers,
  listLeads,
  updateCustomer,
  updateLead,
  updateLeadStatus,
} from "./crm.service";

export async function getCRMStatsController(
  _req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const stats = await getCRMStats();
    res.json({ success: true, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load CRM stats";
    res.status(500).json({ success: false, message });
  }
}

// ─── LEADS HANDLERS ─────────────────────────────────────────────────────────

export async function listLeadsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const query = leadListQuerySchema.parse(req.query);
    const result = await listLeads(req.user!, query);
    res.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list leads";
    res.status(400).json({ success: false, message });
  }
}

export async function getLeadController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = crmIdParamSchema.parse(req.params);
    const lead = await getLeadById(id);
    res.json({ success: true, lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not get lead";
    res.status(404).json({ success: false, message });
  }
}

export async function createLeadController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = createLeadSchema.parse(req.body);
    const lead = await createLead(req.user!, input);
    res.status(201).json({ success: true, message: "Lead created successfully", lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create lead";
    res.status(400).json({ success: false, message });
  }
}

export async function updateLeadController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = crmIdParamSchema.parse(req.params);
    const input = updateLeadSchema.parse(req.body);
    const lead = await updateLead(id, input);
    res.json({ success: true, message: "Lead updated successfully", lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update lead";
    res.status(400).json({ success: false, message });
  }
}

export async function updateLeadStatusController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = crmIdParamSchema.parse(req.params);
    const { status } = updateLeadStatusSchema.parse(req.body);
    const lead = await updateLeadStatus(id, status);
    res.json({ success: true, message: "Lead status updated successfully", lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update lead status";
    res.status(400).json({ success: false, message });
  }
}

export async function convertLeadController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = crmIdParamSchema.parse(req.params);
    const result = await convertLeadToCustomer(id);
    res.json({ message: "Lead converted to Customer successfully", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not convert lead";
    res.status(400).json({ success: false, message });
  }
}

export async function deleteLeadController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = crmIdParamSchema.parse(req.params);
    const result = await deleteLead(id);
    res.json({ success: true, message: "Lead deleted successfully", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete lead";
    res.status(400).json({ success: false, message });
  }
}

// ─── CUSTOMERS HANDLERS ─────────────────────────────────────────────────────

export async function listCustomersController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const query = customerListQuerySchema.parse(req.query);
    const result = await listCustomers(req.user!, query);
    res.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list customers";
    res.status(400).json({ success: false, message });
  }
}

export async function getCustomerController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = crmIdParamSchema.parse(req.params);
    const customer = await getCustomerById(id);
    res.json({ success: true, customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not get customer";
    res.status(404).json({ success: false, message });
  }
}

export async function createCustomerController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = createCustomerSchema.parse(req.body);
    const customer = await createCustomer(req.user!, input);
    res.status(201).json({ success: true, message: "Customer created successfully", customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create customer";
    res.status(400).json({ success: false, message });
  }
}

export async function updateCustomerController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = crmIdParamSchema.parse(req.params);
    const input = updateCustomerSchema.parse(req.body);
    const customer = await updateCustomer(id, input);
    res.json({ success: true, message: "Customer updated successfully", customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update customer";
    res.status(400).json({ success: false, message });
  }
}

export async function deleteCustomerController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = crmIdParamSchema.parse(req.params);
    const result = await deleteCustomer(id);
    res.json({ success: true, message: "Customer deleted successfully", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete customer";
    res.status(400).json({ success: false, message });
  }
}
