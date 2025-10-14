# Manager Dashboard Usage Guide

## Accessing the Manager Dashboard

- URL: `/manager/dashboard`
- Roles: `manager` and `admin`
- Authentication: Supabase Auth session with JWT `role` claim

## Prerequisites

1. **Database migrations**

   ```bash
   supabase db push
   ```

   This applies the base schema plus `20251014120000_minimal_adjustments.sql`, which adds the `annual_leave_remaining` column, helper views, and approval RPCs.

2. **User records**

   - Create/manage Supabase Auth users with a `manager` role claim.
   - Ensure each auth user has a matching row in `employees` (linked via `user_id`).
   - Seed at least one employee row per team member with `annual_leave_remaining`, salary records, attendance data, and optional performance evaluations.

3. **Environment**
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` must be defined.
   - The Supabase project must grant the `authenticated` role select access on `latest_salary` and `latest_performance`, plus execute access on the approval RPCs (handled automatically by the migration).

## Feature Overview

### 1. Employee Directory

- Shows every employee (manager visibility is no longer limited by department).
- Columns: Employee ID, name, position, remaining leave balance, latest salary, and latest performance score.
- "View Details" opens a dialog with contact information, emergency contacts, salary, performance, and remaining leave.
- Top-right "Refresh" button re-fetches data from Supabase.

### 2. Attendance Management

- Date range filter (defaults to the past 7 days) fetches attendance records for all employees.
- Summary counts show present vs absent entries in the current range.
- Managers can mark attendance via a simple form (employee, date, status → present/absent). Submissions upsert into `attendance_records` using the composite unique key.
- Table shows date, employee (with code), status badge, and total hours (if present in the record).

### 3. Leave Requests

- Lists the 100 most recent leave requests for the organization.
- Displays remaining leave balance alongside each request so managers can confirm availability before approval.
- Approve/Reject buttons trigger Supabase RPC calls:
  - `approve_leave` updates status, stamps approver metadata, and deducts `days_requested` from `annual_leave_remaining` (never below zero).
  - `reject_leave` sets status to rejected and records approver metadata without changing balances.
- Refresh button pulls the latest request state and employee balances.

### 4. Performance Snapshot

- Aggregates data from the `latest_performance` view.
- Displays the average of the latest overall ratings (or performance scores if the rating is missing) and the number of evaluations considered.
- Refresh button re-computes the average.

## Manager Workflow Examples

### A. Approving a Leave Request

1. Scroll to the "Leave Requests" card.
2. Locate a row with `status = pending`.
3. Confirm remaining leave balance is adequate.
4. Click **Approve**: the RPC updates the request and reduces the balance in a single transaction.
5. Use **Refresh** to verify the status and updated balance.

### B. Marking Attendance

1. In the "Attendance" card, select an employee and date (defaults to today).
2. Choose status `Present` or `Absent`.
3. Click **Save attendance** to upsert the record.
4. The table refreshes automatically, showing the new or updated entry.

### C. Reviewing Employee Details

1. In the "Employees" card, click **View Details** for any row.
2. Review salary, performance, and remaining leave in the dialog.
3. Close the modal to return to the table.

## Permission Model Recap

- **Employees**: Owner-scoped RLS (can only see/update their own rows across core tables).
- **Managers/Admins**:
  - `select` on all HR tables + helper views.
  - `insert/update` on `attendance_records` for any employee.
  - `update` on `leave_requests` (enforced through the provided RPCs in practice).
- RPCs perform role checks using the JWT `role` claim before modifying leave balances.

## Troubleshooting

- **No employees appear**: ensure Supabase JWT includes the `manager` role and that the `employees` table has rows (with `annual_leave_remaining` set).
- **Attendance save fails**: confirm the unique index `(employee_id, date)` exists and that the authenticated user has the `manager` role claim.
- **Approve/Reject errors**: verify the manager has an `employees.id` (no null `managerId` on the dashboard) and that the migration granting `authenticated` execute on the RPCs ran successfully.
- **Performance average is blank**: add at least one row to `performance_evaluations`; the `latest_performance` view surfaces the most recent entry per employee.

## Next Enhancements (Optional)

- Persisted announcements or broadcast messaging.
- CSV exports for attendance and leave.
- Realtime updates via Supabase channels.
- Additional leave types and approval reasoning capture.
- Deeper analytics (multi-period performance trends, salary progression charts).
