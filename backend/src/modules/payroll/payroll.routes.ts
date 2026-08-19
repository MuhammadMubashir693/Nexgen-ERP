import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import {
  generatePayrollController,
  getEmployeePayslipController,
  getPayrollSummaryController,
  listPayrollEmployeesController,
} from "./payroll.controller";

const router = Router();

router.use(authenticate);

// Payslip can be viewed by employee (for self) or HR/Admin
// Note: optional params not supported in path-to-regexp v8, use two routes
router.get("/payslip", getEmployeePayslipController);
router.get("/payslip/:employeeId", getEmployeePayslipController);

// Payroll Summary & Employees List (Admin, HR, Manager)
router.get("/summary", authorize("ADMIN", "HR", "MANAGER"), getPayrollSummaryController);
router.get("/employees", authorize("ADMIN", "HR", "MANAGER"), listPayrollEmployeesController);

// Generate / Process Payroll Batch (Admin & HR only)
router.post("/generate", authorize("ADMIN", "HR"), generatePayrollController);

export default router;
