import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import {
  generatePayrollBatch,
  getEmployeePayslip,
  getPayrollSummary,
  listPayrollEmployees,
} from "./payroll.service";

export async function getPayrollSummaryController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const summary = await getPayrollSummary(req.user!);
    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load payroll summary";
    res.status(500).json({ success: false, message });
  }
}

export async function listPayrollEmployeesController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { search, departmentId, page, limit } = req.query;
    const result = await listPayrollEmployees(req.user!, {
      search: search ? String(search) : undefined,
      departmentId: departmentId ? String(departmentId) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list payroll items";
    res.status(500).json({ success: false, message });
  }
}

export async function getEmployeePayslipController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const employeeId = typeof req.params.employeeId === "string" ? req.params.employeeId : undefined;
    const payslip = await getEmployeePayslip(req.user!, employeeId);
    res.json({
      success: true,
      payslip,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate payslip";
    res.status(404).json({ success: false, message });
  }
}

export async function generatePayrollController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { scope, departmentId, employeeId, month, year, bonusPercentage, deductionAdjustment, notes } = req.body;

    if (!scope || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "Scope, month, and year are required to generate payroll",
      });
    }

    const batch = await generatePayrollBatch(req.user!, {
      scope,
      departmentId,
      employeeId,
      month: Number(month),
      year: Number(year),
      bonusPercentage: bonusPercentage ? Number(bonusPercentage) : undefined,
      deductionAdjustment: deductionAdjustment ? Number(deductionAdjustment) : undefined,
      notes,
    });

    res.status(201).json({
      success: true,
      message: `Payroll batch generated successfully for ${batch.itemCount} staff member(s)`,
      batch,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate payroll batch";
    res.status(400).json({ success: false, message });
  }
}
