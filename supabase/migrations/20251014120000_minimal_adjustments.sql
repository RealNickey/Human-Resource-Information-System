-- migration: minimal adjustments for MVP manager features
-- adds annual leave balance, simplifies/strengthens manager policies, attendance manage policies, helper views, approve function

begin;

-- 1. Schema adjustments: add annual leave remaining if missing
alter table public.employees
  add column if not exists annual_leave_remaining integer not null default 20;

-- 2. Helper views for latest salary & performance (idempotent)
create or replace view public.latest_salary as
select distinct on (sr.employee_id)
  sr.employee_id,
  sr.base_salary,
  sr.currency,
  sr.effective_date
from public.salary_records sr
order by sr.employee_id, sr.effective_date desc;

create or replace view public.latest_performance as
select distinct on (pe.employee_id)
  pe.employee_id,
  pe.overall_rating,
  pe.performance_score,
  pe.evaluation_period_end
from public.performance_evaluations pe
order by pe.employee_id, pe.evaluation_period_end desc;

-- 3. Replace broad team-based manager policies with role‑gated global manager policies
-- Drop old manager policies if they exist
drop policy if exists "managers can view team employees" on public.employees;
drop policy if exists "managers can view team attendance" on public.attendance_records;
drop policy if exists "managers can view team leave requests" on public.leave_requests;
drop policy if exists "managers can update team leave requests" on public.leave_requests;
drop policy if exists "managers can view team performance" on public.performance_evaluations;

drop policy if exists "managers view all employees" on public.employees;

create policy "managers view all employees"
  on public.employees
  for select
  to authenticated
  using ((auth.jwt() ->> 'role') in ('manager','admin'));

drop policy if exists "managers view all attendance" on public.attendance_records;

create policy "managers view all attendance"
  on public.attendance_records
  for select
  to authenticated
  using ((auth.jwt() ->> 'role') in ('manager','admin'));

drop policy if exists "managers manage attendance" on public.attendance_records;

create policy "managers manage attendance"
  on public.attendance_records
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'role') in ('manager','admin'));

drop policy if exists "managers update attendance" on public.attendance_records;

create policy "managers update attendance"
  on public.attendance_records
  for update
  to authenticated
  using ((auth.jwt() ->> 'role') in ('manager','admin'))
  with check ((auth.jwt() ->> 'role') in ('manager','admin'));

drop policy if exists "managers view all leave" on public.leave_requests;

create policy "managers view all leave"
  on public.leave_requests
  for select
  to authenticated
  using ((auth.jwt() ->> 'role') in ('manager','admin'));

drop policy if exists "managers update leave" on public.leave_requests;

create policy "managers update leave"
  on public.leave_requests
  for update
  to authenticated
  using ((auth.jwt() ->> 'role') in ('manager','admin'))
  with check ((auth.jwt() ->> 'role') in ('manager','admin'));

drop policy if exists "managers view all performance" on public.performance_evaluations;

create policy "managers view all performance"
  on public.performance_evaluations
  for select
  to authenticated
  using ((auth.jwt() ->> 'role') in ('manager','admin'));

-- 4. Helper function for approving leave & decrementing balance
-- Uses security definer to bypass need for manager update on employees; internally checks role claim
create or replace function public.approve_leave(p_leave_id bigint, p_approver_employee_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp bigint;
  v_status text;
  v_days int;
  v_role text;
begin
  v_role := (auth.jwt() ->> 'role');
  if v_role not in ('manager','admin') then
    raise exception 'not authorized';
  end if;

  select employee_id, status, days_requested into v_emp, v_status, v_days
  from public.leave_requests
  where id = p_leave_id
  for update;

  if not found then
    raise exception 'leave request not found';
  end if;
  if v_status <> 'pending' then
    raise exception 'leave request already processed';
  end if;

  update public.leave_requests
    set status = 'approved',
        approved_by = p_approver_employee_id,
        approved_at = now()
    where id = p_leave_id;

  -- decrement remaining leave, clamp at 0
  update public.employees
    set annual_leave_remaining = greatest(annual_leave_remaining - v_days, 0)
    where id = v_emp;
end;
$$;

-- Optional: rejection helper (no balance change)
create or replace function public.reject_leave(p_leave_id bigint, p_approver_employee_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_role text;
begin
  v_role := (auth.jwt() ->> 'role');
  if v_role not in ('manager','admin') then
    raise exception 'not authorized';
  end if;

  select status into v_status from public.leave_requests where id = p_leave_id for update;
  if not found then
    raise exception 'leave request not found';
  end if;
  if v_status <> 'pending' then
    raise exception 'leave request already processed';
  end if;

  update public.leave_requests
    set status = 'rejected',
        approved_by = p_approver_employee_id,
        approved_at = now()
    where id = p_leave_id;
end;
$$;

-- Grants so authenticated users (incl. managers) can query helper views and call functions
grant select on public.latest_salary to authenticated;
grant select on public.latest_performance to authenticated;
grant execute on function public.approve_leave(bigint, bigint) to authenticated;
grant execute on function public.reject_leave(bigint, bigint) to authenticated;

commit;
