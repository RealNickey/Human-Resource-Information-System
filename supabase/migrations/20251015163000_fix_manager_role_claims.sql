-- migration: align manager policies with user metadata roles
-- purpose: ensure manager role detection uses user_metadata.claims and keep leave approval helpers consistent

begin;

drop policy if exists "managers view all employees" on public.employees;
drop policy if exists "managers view all attendance" on public.attendance_records;
drop policy if exists "managers manage attendance" on public.attendance_records;
drop policy if exists "managers update attendance" on public.attendance_records;
drop policy if exists "managers view all leave" on public.leave_requests;
drop policy if exists "managers update leave" on public.leave_requests;
drop policy if exists "managers view all performance" on public.performance_evaluations;

create policy "managers view all employees"
  on public.employees
  for select
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('manager','admin'));

create policy "managers view all attendance"
  on public.attendance_records
  for select
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('manager','admin'));

create policy "managers manage attendance"
  on public.attendance_records
  for insert
  to authenticated
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') in ('manager','admin'));

create policy "managers update attendance"
  on public.attendance_records
  for update
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('manager','admin'))
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') in ('manager','admin'));

create policy "managers view all leave"
  on public.leave_requests
  for select
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('manager','admin'));

create policy "managers update leave"
  on public.leave_requests
  for update
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('manager','admin'))
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') in ('manager','admin'));

create policy "managers view all performance"
  on public.performance_evaluations
  for select
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('manager','admin'));

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
  v_role := (auth.jwt() -> 'user_metadata' ->> 'role');
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

  update public.employees
    set annual_leave_remaining = greatest(annual_leave_remaining - v_days, 0)
    where id = v_emp;
end;
$$;

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
  v_role := (auth.jwt() -> 'user_metadata' ->> 'role');
  if v_role not in ('manager','admin') then
    raise exception 'not authorized';
  end if;

  select status into v_status
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
    set status = 'rejected',
        approved_by = p_approver_employee_id,
        approved_at = now()
    where id = p_leave_id;
end;
$$;

commit;
