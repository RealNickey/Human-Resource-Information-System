-- migration: add manager access policies
-- purpose: allow managers to view and manage their team's data

begin;

-- Allow managers to view all employees in their department
create policy "managers can view team employees"
  on public.employees
  for select
  to authenticated
  using (
    department_id in (
      select e.department_id 
      from public.employees e 
      where e.user_id = (select auth.uid())
    )
  );

-- Allow managers to view team attendance records
create policy "managers can view team attendance"
  on public.attendance_records
  for select
  to authenticated
  using (
    employee_id in (
      select e.id 
      from public.employees e 
      where e.department_id in (
        select e2.department_id 
        from public.employees e2 
        where e2.user_id = (select auth.uid())
      )
    )
  );

-- Allow managers to view team leave requests
create policy "managers can view team leave requests"
  on public.leave_requests
  for select
  to authenticated
  using (
    employee_id in (
      select e.id 
      from public.employees e 
      where e.department_id in (
        select e2.department_id 
        from public.employees e2 
        where e2.user_id = (select auth.uid())
      )
    )
  );

-- Allow managers to update leave requests (for approval/rejection)
create policy "managers can update team leave requests"
  on public.leave_requests
  for update
  to authenticated
  using (
    employee_id in (
      select e.id 
      from public.employees e 
      where e.department_id in (
        select e2.department_id 
        from public.employees e2 
        where e2.user_id = (select auth.uid())
      )
    )
  )
  with check (
    employee_id in (
      select e.id 
      from public.employees e 
      where e.department_id in (
        select e2.department_id 
        from public.employees e2 
        where e2.user_id = (select auth.uid())
      )
    )
  );

-- Allow managers to view team performance evaluations
create policy "managers can view team performance"
  on public.performance_evaluations
  for select
  to authenticated
  using (
    employee_id in (
      select e.id 
      from public.employees e 
      where e.department_id in (
        select e2.department_id 
        from public.employees e2 
        where e2.user_id = (select auth.uid())
      )
    )
  );

commit;
