# Nexgen ERP

A full-stack Enterprise Resource Planning system covering HR, attendance, leave,
CRM, projects/tasks, documents, notifications, and system administration.

**Stack:** React + Vite + TypeScript (frontend) · Express + TypeScript (backend)
· PostgreSQL via Supabase · Prisma ORM · Supabase Auth & Storage

---

## Project Structure

```
Nexgen-ERP/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Data model (source of truth)
│   │   ├── seed.ts              # Demo data + auth users
│   │   └── migrations/
│   ├── src/
│   │   ├── modules/             # One folder per feature: routes, controller, service, validation
│   │   │   ├── auth/
│   │   │   ├── employees/
│   │   │   ├── departments/
│   │   │   ├── attendance/
│   │   │   ├── leave/
│   │   │   ├── payroll/
│   │   │   ├── crm/
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   ├── documents/
│   │   │   ├── notifications/
│   │   │   ├── administration/  # Admin-only activity log & system stats
│   │   │   └── dashboard/
│   │   ├── middleware/          # authenticate, authorize, error handling
│   │   ├── lib/                 # prisma client, supabase clients, notify/log helpers
│   │   ├── app.ts               # Express app + route registration
│   │   └── server.ts            # Entry point
│   └── .env
└── frontend/
    ├── src/
    │   ├── pages/                # One page per nav item
    │   ├── components/
    │   │   ├── auth/             # Login, forgot/reset password
    │   │   ├── layout/           # Sidebar, Header
    │   │   └── ui/               # Shared design system components
    │   ├── api/                  # One file per backend module, thin fetch wrappers
    │   ├── lib/                  # auth context, misc helpers
    │   └── App.tsx                # Page routing (state-based, no router library)
    └── .env
```

## Getting Started

### 1. Prerequisites
- Node.js 20+
- A Supabase project (PostgreSQL database + Auth)

### 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```
DATABASE_URL=<Supabase pooled connection string, port 6543>
DIRECT_URL=<Supabase direct connection string, port 5432>
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>
SUPABASE_SECRET_KEY=<service_role key — server-only, never expose to frontend>
PORT=5000
```

Run migrations and seed demo data:

```bash
npx prisma migrate dev
npm run db:seed
```

Start the API:

```bash
npm run dev
```

The API runs at `http://localhost:5000`. Health check: `GET /api/health`.

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>
```

Start the dev server:

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

### 4. Supabase configuration for password reset

The "Forgot password" flow uses Supabase's email-based recovery link. In your
Supabase project dashboard, go to **Authentication → URL Configuration** and
add your frontend origin (e.g. `http://localhost:5173/`) to the **Redirect
URLs** allowlist. Without this, the reset email link will fail to redirect
back to the app.

## Demo Accounts

Seeded by `npm run db:seed` (see console output after seeding for the full
list). Default password for all seeded accounts: `Password123!`

| Email | Role |
|---|---|
| admin@erp.test | ADMIN |
| hr@erp.test | HR |
| manager@erp.test | MANAGER |
| employee1@erp.test | EMPLOYEE |
| employee2@erp.test | EMPLOYEE |

## Roles & Permissions Summary

- **ADMIN** — full system access, including Administration (activity log,
  user/role stats), hard-delete of employees, department deletion.
- **HR** — employee records, department management, leave type configuration,
  payroll generation, attendance overrides.
- **MANAGER** — approves leave for their department/direct reports, manages
  projects and tasks, views team attendance/payroll summaries.
- **EMPLOYEE** — self-service: profile, attendance check-in/out, leave
  requests, assigned tasks, own payslip, notifications.

Only ADMIN/HR can create employee accounts — there is no public self-signup.

## Further Documentation

- [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) — full endpoint reference
- [`USER_MANUAL.md`](./USER_MANUAL.md) — feature walkthrough by role

## Known Limitations (Roadmap)

This is an MVP scope. The following are intentionally not implemented and are
tracked as future work: Inventory management, Sales & Purchase orders,
full double-entry Finance module (payroll exists, but general ledger/expense
tracking does not), scheduled/exportable Reports, and email delivery for
in-app notifications (currently in-app only).
