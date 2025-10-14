# Minimal Manager Dashboard Implementation Plan (Reduced Scope)

Date: 2025-10-14  
Scope: ONLY the essential HRIS features required for initial Manager + Employee workflows. No advanced analytics, no announcements, no sparkline charts, no pagination, no audit/event logging. Focus on working CRUD with Supabase + correct role restrictions.

Included Minimal Features:

1. Authentication & basic role guard (manager vs employee) for `/manager/dashboard`.
2. Employees:

- Manager can view a list of all employees (ID, full name, position/job title — minimal columns).
- Manager can open / view basic employee details (read-only) including remaining leave balance & salary (if permitted).
- Employee ID auto-filled in all employee-originated forms (leave request, attendance self-view if later added).

3. Attendance:

- Manager can view attendance records for employees over a selectable date range.
- Manager can mark (create/update) attendance for a specific employee & date (status: Present / Absent [MVP]).
- Employees may (optional) view their own attendance (read-only) — keep simple if already scaffolded.

4. Leave:

- Employee can submit a leave request (auto-filled employee_id; status defaults to pending).
- Manager can view all leave requests (all employees) and approve OR reject (no need for rejection reason field; simple status toggle + timestamp + approved_by manager id).
- Display remaining leave balance for each employee (e.g. annual leave remaining) while creating or reviewing a request.

5. Salary:

- Manager can view base salary info per employee (amount + currency + effective_from).
- Employee can view their own salary info.

6. Performance (Basic):

- Show a simple latest performance score OR average of last N (e.g. last 3) evaluations for each employee (table column or small card). No charts, no trend lines.

Out of Scope / Explicitly NOT Implemented Now:

- Announcements, pinning, real-time features, sparkline/trend charts, CSV export, pagination, audit logging, complex filters, search, advanced a11y refinements, caching layers, optimistic update complexity (simple refetch acceptable).

---

## 1. Minimal Data Model (Tables & Fields)

Use or create only what is strictly necessary. (Adjust naming to match any existing tables if already present.)

employees (assumed existing core table)

- id (bigint PK)
- user_id (uuid -> auth.users.id)
- full_name text
- position text
- annual_leave_remaining integer (can live here for MVP; later move to separate balances table if needed)
- base_salary numeric(12,2) (MVP: store current salary directly; advanced history handled later)
- performance_last_score numeric(5,2) (optional denormalized helper for quick display) OR compute from evaluations table

attendance

- id bigint generated identity PK
- employee_id bigint references employees(id) on delete cascade
- att_date date not null
- status text check (status in ('present','absent')) not null
- created_at timestamptz default now()
- unique (employee_id, att_date)

leave_requests

- id bigint generated identity PK
- employee_id bigint references employees(id) on delete cascade
- start_date date not null
- end_date date not null
- type text default 'annual' (keep minimal)
- status text default 'pending' check (status in ('pending','approved','rejected'))
- approved_by bigint references employees(id)
- approved_at timestamptz
- created_at timestamptz default now()

performance_evaluations (optional if not already)

- id bigint identity PK
- employee_id bigint references employees(id) on delete cascade
- score numeric(5,2) not null
- period_start date
- period_end date
- created_at timestamptz default now()

salary_records (only if you prefer history; otherwise skip and store base_salary on employees)

- id bigint identity
- employee_id bigint references employees(id)
- amount numeric(12,2) not null
- currency text default 'USD'
- effective_from date not null
- created_at timestamptz default now()

If historical tables (salary_records, performance_evaluations) are omitted, adapt code to read denormalized fields from employees.

---

## 2. Minimal RLS Policies (Conceptual)

Goal: Employees see only their own sensitive data; Managers see all employees & related HR data required.

employees (SELECT):

- Allow employee to select own row (user_id = auth.uid()).
- Allow manager role to select all rows.

attendance:

- SELECT: employee sees own records; manager role sees all.
- INSERT/UPDATE: manager role only (for marking attendance). (Later optionally allow employee self-mark with pending state.)

leave_requests:

- SELECT: employee sees own; manager role sees all.
- INSERT: employee can insert for self (employee_id must match their row).
- UPDATE: manager role can update status fields; employee cannot modify once created (except maybe cancel while pending - skip for MVP).

performance_evaluations (if used):

- SELECT: employee sees own; manager sees all.

salary_records or employees.base_salary:

- SELECT: employee sees own salary; manager role sees all salaries.

Implement policies using role claim in JWT (e.g. auth.jwt() -> role) or join employees table via auth.uid().

---

## 3. Minimal UI / Components

Manager Dashboard (page):

- Employees table: columns (Employee ID, Name, Position, Remaining Leave, Base Salary, Latest Performance Score) + View button.
- Employee detail modal: shows basic profile + remaining leave + salary + last performance score.
- Attendance section: date range selector (start/end date) + table (Employee, Date, Status). Form to mark attendance (select employee, date, status). Auto-fill today date convenience.
- Leave requests section: table (Employee, Dates, Type, Status, Actions). Approve/Reject buttons.

Employee Self Pages (if already exist):

- Leave request form (auto-fill employee ID from session; show remaining leave).
- Salary & performance simple display card.

Shared minimal components:

- Basic DateRangePicker (could reuse existing calendar if present) for attendance.
- Simple StatusBadge (approved / pending / rejected; present / absent).

---

## 4. Key Interactions / Flows

Mark Attendance (Manager):

1. Select employee.
2. Pick date (default today).
3. Choose status (present/absent).
4. Submit -> Upsert (if record exists update, else insert). Refresh list.

Submit Leave (Employee):

1. Open leave form; employee_id hidden & auto-filled from session.
2. Choose start_date, end_date, type (optional). Submit -> status 'pending'.
3. Decrement remaining leave UI side only after approval (MVP can decrement immediately on approval server-side).

Approve/Reject Leave (Manager):

1. View pending list.
2. Click Approve -> update status, set approved_by & approved_at; decrement employee annual_leave_remaining (if using that approach) inside a single DB call (RPC or transaction) to avoid race.
3. Click Reject -> update status to rejected (no reason required for MVP).

View Performance (Manager/Employee):

- If using evaluations table: query last 1 (ORDER BY created_at DESC LIMIT 1) or compute AVG over last 3. Show numeric value only.

Show Remaining Leave:

- Display `employees.annual_leave_remaining` directly.

---

## 5. Minimal Server / Data Layer

Supabase client usage only (no extra caching):

- employees: select necessary columns only.
- attendance: range filter `att_date >= from AND att_date <= to`.
- leave_requests: simple select (maybe order by created_at desc).
- Upserts: attendance mark implemented via `insert ... on conflict (employee_id, att_date) do update set status = excluded.status` (defined by unique constraint).
- Leave approval: single update call with match on id AND current status = 'pending' (optional). If also decrement leave balance: perform a Postgres function (preferred) `rpc('approve_leave', { p_leave_id })` that updates leave_requests and employees remaining leave atomically.

Optional single SQL function (MVP nice-to-have):

```sql
create or replace function approve_leave(p_leave_id bigint, p_approver_id bigint)
returns void language plpgsql security definer as $$
declare v_emp bigint; v_days int; v_status text; begin
  select employee_id, status, (end_date - start_date + 1) into v_emp, v_status, v_days from leave_requests where id = p_leave_id for update;
  if v_status <> 'pending' then raise exception 'Already processed'; end if;
  update leave_requests set status='approved', approved_by=p_approver_id, approved_at=now() where id=p_leave_id;
  update employees set annual_leave_remaining = annual_leave_remaining - v_days where id = v_emp;
end; $$;
```

RLS must allow execution by manager role.

Reject function similar but without decrement.

---

## 6. Minimal Implementation Checklist (Actionable)

Schema / Migrations
[ ] Create/verify tables: attendance, leave_requests (and optionally performance_evaluations, salary_records) with minimal columns.
[ ] Add unique constraint on (employee_id, att_date) in attendance.
[ ] Add indexes: attendance(att_date), leave_requests(status).
[ ] Add/confirm columns on employees: annual_leave_remaining, base_salary, performance_last_score (if denormalizing).
[ ] Write required RLS policies for each table (self vs manager) & enable RLS.
[ ] (Optional) Approve/Reject SQL functions for atomic updates.

Types / Lib
[ ] Update `lib/types.ts` with TS interfaces: EmployeeMinimal, AttendanceRecord, LeaveRequest, PerformanceEvaluation (optional).
[ ] Add helper `getSessionEmployee()` to fetch employee row for current auth user.
[ ] Add simple `supabaseServer()` / `supabaseBrowser()` usage (if not already) for data fetches.

Attendance UI
[ ] Create date range state (defaults: today - 7 days to today?).
[ ] Query attendance via Supabase with range filter.
[ ] Render table (Employee, Date, Status).
[ ] Attendance mark form (select employee, date, status) -> upsert.
[ ] Refresh list after submit.

Leave UI
[ ] Employee leave request form (start_date, end_date, type) auto-fill employee_id.
[ ] Insert pending leave; show simple success/fail message.
[ ] Manager leave requests table with Approve / Reject buttons.
[ ] On Approve: call update (or RPC) -> refresh.
[ ] On Reject: update status -> refresh.
[ ] Display remaining leave in both forms & manager employee list.

Employees UI
[ ] Manager employee list query (id, full_name, position, annual_leave_remaining, base_salary, performance_last_score).
[ ] View details modal (same fields plus maybe contact email if allowed).

Salary & Performance
[ ] If using historical tables: latest salary record query; latest or average performance query.
[ ] Else: show denormalized fields directly.

Security & Access
[ ] Middleware redirect non-manager away from `/manager/...` routes.
[ ] Ensure employee forms validate employee_id === session employee.id (never trust client-sent id).

Basic Validation
[ ] Prevent negative remaining leave (check before decrement or clamp >=0).
[ ] Leave request date sanity: end_date >= start_date.

Testing (Smoke Level)
[ ] Manager can list employees (expect >0 rows in seed data).
[ ] Employee submits leave -> appears as pending for manager.
[ ] Manager approves leave -> status changes, remaining leave decreases by correct day count.
[ ] Manager marks attendance -> record visible immediately.
[ ] Date range filter changes attendance list size (simulate narrowing range).

Docs
[ ] Replace old plan with this minimal plan (done).
[ ] Update `ROLE_BASED_AUTH.md` with simplified policies summary.
[ ] Add short usage steps to `USAGE_GUIDE.md` (submit leave, approve leave, mark attendance).

Deployment
[ ] Run migrations on Supabase instance.
[ ] Set environment variables in deployment platform.
[ ] Manual smoke test with one manager + one employee account.

---

## 7. Acceptance Criteria (Minimal)

- [ ] Manager dashboard loads employee list (with remaining leave & salary column) without errors.
- [ ] Manager can mark attendance; data persists and re-fetch shows new/updated status.
- [ ] Manager can view attendance filtered by date range.
- [ ] Employee can submit a leave request; status = pending.
- [ ] Manager can approve and reject leave; status persists; approving reduces remaining leave.
- [ ] Remaining leave displays correctly before and after approval.
- [ ] Salary info visible to manager for all, and to employee for themselves.
- [ ] Performance score (latest or average) shown (even if placeholder or denormalized field) with graceful fallback if none.
- [ ] Employee detail modal shows expected fields; no unauthorized data leak occurs under RLS tests.
- [ ] Basic RLS smoke tests confirm: employee cannot read another employee's leave request directly.

---

## 8. Notes & Future (After MVP)

After this minimal slice is stable, future increments can add: search, pagination, announcements, trend charts, CSV export, audit logging, improved accessibility & testing depth, real-time updates, and performance optimization.

This file intentionally avoids complexity to accelerate a working baseline.
