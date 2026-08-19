import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./modules/auth/auth.routes";
import employeeRoutes from "./modules/employees/employee.routes";
import departmentRoutes from "./modules/departments/department.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import leaveRoutes from "./modules/leave/leave.routes";
import payrollRoutes from "./modules/payroll/payroll.routes";
import projectRoutes from "./modules/projects/project.routes";
import taskRoutes from "./modules/tasks/task.routes";
import crmRoutes from "./modules/crm/crm.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import documentRoutes from "./modules/documents/document.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import administrationRoutes from "./modules/administration/administration.routes";

const app = express();

const allowedOrigins = ['https://nexgen-erp.vercel.app', 'http://localhost:5173']; // Replace with your actual Vercel URL

app.use(cors({
  origin: allowedOrigins,  // NOT "*" – because you're using credentials (cookies/auth headers)
  credentials: true,       // if you send cookies or Authorization header
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "ERP API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/administration", administrationRoutes);

export default app;