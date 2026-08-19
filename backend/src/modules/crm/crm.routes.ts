import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  convertLeadController,
  createCustomerController,
  createLeadController,
  deleteCustomerController,
  deleteLeadController,
  getCRMStatsController,
  getCustomerController,
  getLeadController,
  listCustomersController,
  listLeadsController,
  updateCustomerController,
  updateLeadController,
  updateLeadStatusController,
} from "./crm.controller";

const router = Router();

router.use(authenticate);

// Overall CRM Stats
router.get("/stats", getCRMStatsController);

// Leads Routes
router.get("/leads", listLeadsController);
router.post("/leads", createLeadController);
router.get("/leads/:id", getLeadController);
router.patch("/leads/:id", updateLeadController);
router.patch("/leads/:id/status", updateLeadStatusController);
router.post("/leads/:id/convert", convertLeadController);
router.delete("/leads/:id", deleteLeadController);

// Customers Routes
router.get("/customers", listCustomersController);
router.post("/customers", createCustomerController);
router.get("/customers/:id", getCustomerController);
router.patch("/customers/:id", updateCustomerController);
router.delete("/customers/:id", deleteCustomerController);

export default router;
