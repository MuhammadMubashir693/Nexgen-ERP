# Nexgen ERP — User Manual

## Signing In

Go to the app URL and enter your email and password. Accounts are created by
an Administrator or HR — there is no public sign-up page.

**Forgot your password?** Click **Forgot password?** below the sign-in form,
enter your email, and a reset link will be sent to you. Click the link in the
email, choose a new password, and you'll be able to sign in immediately. This
works even if you're not currently signed in anywhere.

If you're already signed in and just want to change your password, go to
**Profile → Account & Security** instead (see below).

---

## Navigation

The left sidebar is organized into sections:

- **Dashboard** — your at-a-glance overview
- **People** — Employees, Attendance & Leave, Payroll
- **Operations** — CRM, Projects & Tasks
- **Knowledge** — Documents
- **System** — Notifications, Administration (Admins only)

Click your avatar in the top-right corner for **My Profile**, **Account
Settings**, and **Sign out**. The bell icon shows your unread notification
count.

---

## Your Profile

**Profile → Personal Information** — update your name, phone, address,
gender, date of birth, and profile picture.

**Profile → Account & Security** — change your password (you'll need to
know your current session is active; this is different from the "Forgot
password" flow used when signed out), and see a summary of what your role
can access.

---

## Notifications

Click the bell icon in the header to see your 10 most recent notifications.
Click any notification to mark it read. Click **View all notifications** to
open the full Notifications page, where you can:

- Filter by read/unread status and by type (System, Task, Leave, Project)
- Mark individual notifications or everything as read
- Delete notifications you no longer need

You'll automatically receive a notification when:
- A leave request you submitted is approved or rejected
- A task is assigned or reassigned to you

---

## Attendance & Leave

**Checking in/out:** Go to Attendance and click **Check In** at the start of
your day, **Check Out** at the end. Your daily status (present, late,
absent, half-day, or on leave) is tracked automatically.

**Requesting leave:** From the Attendance & Leave page, submit a new leave
request with a leave type (Sick, Casual, Annual, etc.), date range, and
reason. Your request starts as **Pending**.

**Approving leave (Managers, HR, Admins):** Pending requests from your team
appear in the approval queue. Approving a request automatically marks the
employee's attendance as "leave" for each day in the range and notifies them.

---

## Employees & Departments

*(Visible to everyone; creating/editing restricted to HR and Admins.)*

Browse the employee directory, view individual profiles, and (if you're HR
or Admin) create new employee accounts — this also sets up their login.
Admins can deactivate or permanently delete accounts; HR cannot manage Admin
accounts.

Departments show their assigned manager and staff count. Only Admins can
deactivate a department.

---

## Payroll

Employees can view their own payslips under Payroll. HR and Admins can
generate a payroll batch for a pay period and view summaries across the
whole organization; Managers can view (but not generate) summaries for
their team.

---

## CRM

Track **Leads** through their pipeline (New → Contacted → Qualified → Won/Lost)
and convert a qualified lead directly into a **Customer**. Customer records
show linked projects and originating leads.

---

## Projects & Tasks

Admins, HR, and Managers can create projects, optionally linking them to a
CRM customer. Anyone can create and manage tasks within a project — set a
title, assignee, priority, and due date. Moving a task's status (e.g. To Do →
In Progress → Done) is available to everyone working on it. Assigning or
reassigning a task automatically notifies the new assignee.

---

## Documents

Upload files (up to 25MB) and optionally link them to an employee, project,
or customer record. Download links are generated on demand and expire after
an hour for security.

---

## Administration (Admins only)

The Administration page gives Admins two things:

**System overview cards** — total/active users broken down by role, and
high-level activity statistics.

**Activity Log** — a searchable, filterable audit trail of key actions
across the system (who did what, when, to which record). Filter by action
type (created/updated/deleted/approved/rejected/login/logout) or search by
the acting user's name/email. Click **View details** on any entry to see the
exact before/after data captured for that action.

Currently logged: employee account deletions, payroll batch generation, and
document uploads. This is the audit trail referenced in the technical
documentation as a foundation to expand to other modules over time.

---

## Roles at a Glance

| Can... | Employee | Manager | HR | Admin |
|---|:---:|:---:|:---:|:---:|
| Check in/out, request leave | ✅ | ✅ | ✅ | ✅ |
| Approve team leave requests | | ✅ | ✅ | ✅ |
| Create/edit employee records | | | ✅ | ✅ |
| Deactivate/delete employees | | | | ✅ |
| Generate payroll | | | ✅ | ✅ |
| Create projects | | ✅ | ✅ | ✅ |
| Manage CRM leads/customers | ✅ | ✅ | ✅ | ✅ |
| View Administration / Activity Log | | | | ✅ |

---

## Getting Help

If something doesn't look right or you've lost access, contact your HR or
Admin — only they can create, modify, or deactivate accounts.
