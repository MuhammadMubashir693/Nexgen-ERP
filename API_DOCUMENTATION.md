# API Documentation

Base URL: `http://localhost:5000/api` (development)

## Authentication

All endpoints except `GET /api/health` require a Supabase-issued JWT:

```
Authorization: Bearer <access_token>
```

Tokens are obtained by authenticating directly against Supabase (see
`POST /auth/v1/token?grant_type=password` in the frontend's `api/client.ts`),
not through this backend — this backend only validates the token and looks up
the matching profile in the `User` table. There is no `/api/auth/login`
endpoint; login is handled client-side against Supabase.

**Roles:** `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`. Endpoints marked with a role
list are restricted via the `authorize(...)` middleware; unmarked endpoints
are open to any authenticated user (often with additional row-level scoping
inside the service layer — e.g. an EMPLOYEE only ever sees their own leave
requests even though the endpoint itself has no role gate).

**Response shape:** all endpoints return JSON with a `success: boolean`
field. Successful responses include the requested data alongside `success:
true`; errors include `success: false` and a `message` string.

---

## Auth (`/api/auth`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/me` | Any authenticated user | Current user's full profile (including linked employee record, department) |
| PATCH | `/profile` | Any authenticated user | Update own name, contact info, theme accent |
| POST | `/change-password` | Any authenticated user | Change own password (requires being logged in — see note below) |

**Note on password reset vs. change-password:** `/change-password` is for a
logged-in user updating their password from Settings. A separate, unauthenticated
**forgot-password** flow (any user, no login required) is implemented entirely
client-side against Supabase's Auth REST API directly:
- `POST {SUPABASE_URL}/auth/v1/recover` — request a reset email
- `PUT {SUPABASE_URL}/auth/v1/user` (with the recovery token as Bearer) — set new password

See `frontend/src/api/client.ts` (`requestPasswordReset`, `completePasswordReset`).

---

## Employees (`/api/employees`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Any | List employees (results scoped by role at the service level) |
| GET | `/:id` | Any | Get a single employee |
| POST | `/` | ADMIN, HR | Create an employee (also provisions the Supabase auth user + `User` profile) |
| PATCH | `/:id` | ADMIN, HR | Update an employee. HR cannot create/update ADMIN-role accounts |
| DELETE | `/:id` | ADMIN | Deactivate (soft delete) |
| DELETE | `/:id/hard` | ADMIN | Permanently delete. Cannot delete your own account |
| POST | `/me/avatar` | Any | Upload own avatar (multipart, field name `avatar`, max 5MB) |
| DELETE | `/me/avatar` | Any | Remove own avatar |

## Departments (`/api/departments`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Any | List departments |
| GET | `/:id` | Any | Get a department, including member list |
| POST | `/` | ADMIN, HR | Create a department |
| PATCH | `/:id` | ADMIN, HR | Update name/description/manager/active status |
| DELETE | `/:id` | ADMIN | Deactivate a department |

## Attendance (`/api/attendance`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/today` | Any | Current user's attendance status for today |
| POST | `/check-in` | Any | Punch in |
| POST | `/check-out` | Any | Punch out |
| GET | `/stats` | Any | Attendance stats (scoped by role) |
| GET | `/` | Any | List attendance records (scoped by role) |
| POST | `/manual` | ADMIN, HR | Manually record attendance for an employee |
| POST | `/bulk` | ADMIN, HR | Bulk-mark attendance |
| PATCH | `/:id` | ADMIN, HR | Edit an attendance record |
| DELETE | `/:id` | ADMIN, HR | Delete an attendance record |

## Leave (`/api/leaves`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/types` | Any | List leave types |
| POST | `/types` | ADMIN, HR | Create a leave type |
| PATCH | `/types/:id` | ADMIN, HR | Update a leave type |
| GET | `/stats` | Any | Leave balance/usage stats (scoped by role) |
| GET | `/` | Any | List leave requests (scoped by role) |
| POST | `/` | Any | Submit a leave request (for self, or for any employee if ADMIN/HR) |
| PATCH | `/:id/status` | ADMIN, HR, MANAGER | Approve/reject. Approving also syncs `Attendance` records for the date range and **notifies the employee** |
| DELETE | `/:id` | Owner, or ADMIN/HR | Cancel a pending request |

## Payroll (`/api/payroll`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/payslip` | Any | Own payslip for a given period |
| GET | `/payslip/:employeeId` | Any (self) or ADMIN/HR | Payslip for a specific employee |
| GET | `/summary` | ADMIN, HR, MANAGER | Payroll summary across employees |
| GET | `/employees` | ADMIN, HR, MANAGER | List employees with payroll figures |
| POST | `/generate` | ADMIN, HR | Generate a payroll batch (writes an `ActivityLog` entry) |

## Projects (`/api/projects`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/stats` | Any | Project stats overview |
| GET | `/` | Any | List projects |
| GET | `/:id` | Any | Get a project |
| POST | `/` | ADMIN, HR, MANAGER | Create a project |
| PATCH | `/:id` | ADMIN, HR, MANAGER | Update a project |
| DELETE | `/:id` | ADMIN | Delete a project |

## Tasks (`/api/tasks`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Any | List tasks |
| GET | `/:id` | Any | Get a task |
| POST | `/` | Any | Create a task. **Notifies the assignee**, if one is set |
| PATCH | `/:id` | Any | Update a task. **Notifies the new assignee** if reassigned |
| PATCH | `/:id/status` | Any | Update task status (e.g. moving through a kanban board) |
| DELETE | `/:id` | Any | Delete a task |

## CRM (`/api/crm`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/stats` | Any | Overall CRM stats |
| GET | `/leads` | Any | List leads |
| POST | `/leads` | Any | Create a lead |
| GET | `/leads/:id` | Any | Get a lead |
| PATCH | `/leads/:id` | Any | Update a lead |
| PATCH | `/leads/:id/status` | Any | Update lead status |
| POST | `/leads/:id/convert` | Any | Convert a lead to a customer |
| DELETE | `/leads/:id` | Any | Delete a lead |
| GET | `/customers` | Any | List customers |
| POST | `/customers` | Any | Create a customer |
| GET | `/customers/:id` | Any | Get a customer, including linked projects/leads |
| PATCH | `/customers/:id` | Any | Update a customer |
| DELETE | `/customers/:id` | Any | Delete a customer |

## Documents (`/api/documents`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/stats` | Any | Document stats |
| GET | `/` | Any | List documents |
| POST | `/upload` | Any | Upload a file (multipart, field name `file`, max 25MB). Writes an `ActivityLog` entry |
| GET | `/:id` | Any | Get document metadata |
| GET | `/:id/download` | Any | Get a signed download URL |
| PATCH | `/:id` | Any | Update document metadata |
| DELETE | `/:id` | Any | Delete a document |

## Notifications (`/api/notifications`)

All notification endpoints are implicitly scoped to the current user — there
is no cross-user access and no role restriction, since a user can only ever
see their own notifications.

| Method | Path | Description |
|---|---|---|
| GET | `/` | List own notifications. Query params: `isRead`, `type` (`system`\|`task`\|`leave`\|`project`), `page`, `limit` |
| GET | `/unread-count` | Own unread count only (used for the header badge) |
| PATCH | `/:id/read` | Mark one notification read |
| PATCH | `/read-all` | Mark all own notifications read |
| DELETE | `/:id` | Delete a notification |

Notifications are currently created server-side only (no endpoint to create
one directly) — triggered automatically by leave approval/rejection and task
assignment. See `backend/src/lib/notify.ts`.

## Administration (`/api/administration`)

ADMIN-only for every endpoint in this module (no HR/Manager carve-out, unlike
most other modules — activity logs span every module and are treated as
sensitive across the board).

| Method | Path | Description |
|---|---|---|
| GET | `/activity-log` | Paginated activity log. Query params: `userId`, `action`, `entityType`, `startDate`, `endDate` (YYYY-MM-DD), `search`, `page`, `limit` |
| GET | `/activity-log/stats` | Total events, events in last 30 days, distinct actors, action breakdown |
| GET | `/users/stats` | Total/active/inactive user counts, breakdown by role |

**Activity log entries** are written by: employee hard-delete (clears
`userId` to preserve history), payroll batch generation, document upload.
Other modules do not currently write activity log entries — see
`backend/src/lib/notify.ts`'s `logActivity()` helper if extending this.

## Dashboard (`/api/dashboard`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/overview` | Any | Cross-module summary: employee/department counts, today's attendance, payroll estimate, project/task stats, CRM stats, recent activity feed |

---

## Error Responses

```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

| Status | Meaning |
|---|---|
| 400 | Validation error or bad request |
| 401 | Missing/invalid/expired token |
| 403 | Authenticated, but insufficient role/ownership |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate) |
| 500 | Unexpected server error |
