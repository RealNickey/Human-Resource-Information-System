-- migration: seed demo HR data for dashboards (remote alignment)
-- purpose: mirror hosted dataset seeding to keep environments consistent

begin;

-- 1. Ensure core departments exist
insert into public.departments (name, description)
values
  ('Engineering', 'Product development and platform engineering teams'),
  ('Human Resources', 'People operations and employee experience'),
  ('Finance', 'Payroll, accounting, and compliance functions')
on conflict (name) do update
set description = excluded.description,
    updated_at = now();

-- 2. Map a few demo employees into departments and roles if not already set
with mapping as (
  select e.id,
         e.employee_id,
         m.dept_name,
         m.title
  from public.employees e
  join (
    values
      ('EMP-D94828A3B6', 'Human Resources', 'HR Specialist'),
      ('EMP-4D9CC7E06E', 'Engineering', 'Senior Software Engineer'),
      ('EMP-922EBCAB22', 'Engineering', 'Quality Assurance Analyst'),
      ('EMP-0F35370ORB', 'Finance', 'Payroll Coordinator')
  ) as m(emp_code, dept_name, title)
  on m.emp_code = e.employee_id
)
update public.employees e
set department_id = d.id,
    position = coalesce(e.position, mapping.title)
from mapping
join public.departments d on d.name = mapping.dept_name
where e.id = mapping.id
  and (e.department_id is distinct from d.id or e.position is distinct from mapping.title);

-- 3. Seed salary history (two records per employee to show progression)
with employee_lookup as (
  select id, employee_id
  from public.employees
  where employee_id in ('EMP-D94828A3B6', 'EMP-4D9CC7E06E', 'EMP-922EBCAB22')
),
salary_rows as (
  select el.id as employee_id,
         (current_date - sr.offset_days)::date as effective_date,
         sr.amount as base_salary,
         sr.salary_type,
         sr.currency
  from employee_lookup el
  join (
    values
      ('EMP-D94828A3B6', 365, 62000::numeric, 'annual', 'USD'),
      ('EMP-D94828A3B6', 90, 68000::numeric, 'annual', 'USD'),
      ('EMP-4D9CC7E06E', 365, 88000::numeric, 'annual', 'USD'),
      ('EMP-4D9CC7E06E', 30, 95000::numeric, 'annual', 'USD'),
      ('EMP-922EBCAB22', 240, 66000::numeric, 'annual', 'USD'),
      ('EMP-922EBCAB22', 15, 72000::numeric, 'annual', 'USD')
  ) as sr(emp_code, offset_days, amount, salary_type, currency)
    on sr.emp_code = el.employee_id
)
insert into public.salary_records (employee_id, base_salary, effective_date, salary_type, currency)
select employee_id, base_salary, effective_date, salary_type, currency
from salary_rows
on conflict (employee_id, effective_date) do update
set base_salary = excluded.base_salary,
    salary_type = excluded.salary_type,
    currency = excluded.currency;

-- 4. Seed attendance records for the last few days
with employee_lookup as (
  select id, employee_id
  from public.employees
  where employee_id in ('EMP-D94828A3B6', 'EMP-4D9CC7E06E', 'EMP-922EBCAB22')
),
attendance_rows as (
  select el.id as employee_id,
         (current_date - ar.offset_days)::date as date,
         ar.status,
         ar.total_hours,
         ar.break_minutes
  from employee_lookup el
  join (
    values
      ('EMP-D94828A3B6', 0, 'present', 8.0::numeric, 45),
      ('EMP-D94828A3B6', 1, 'present', 7.5::numeric, 60),
      ('EMP-D94828A3B6', 2, 'sick', null::numeric, 0),
      ('EMP-4D9CC7E06E', 0, 'present', 8.5::numeric, 30),
      ('EMP-4D9CC7E06E', 1, 'present', 8.0::numeric, 45),
      ('EMP-4D9CC7E06E', 2, 'present', 7.8::numeric, 45),
      ('EMP-922EBCAB22', 0, 'partial', 4.0::numeric, 30),
      ('EMP-922EBCAB22', 1, 'present', 8.0::numeric, 45),
      ('EMP-922EBCAB22', 2, 'present', 8.2::numeric, 45)
  ) as ar(emp_code, offset_days, status, total_hours, break_minutes)
    on ar.emp_code = el.employee_id
)
insert into public.attendance_records (employee_id, date, status, total_hours, break_duration_minutes)
select employee_id, date, status, total_hours, break_minutes
from attendance_rows
on conflict (employee_id, date) do update
set status = excluded.status,
    total_hours = excluded.total_hours,
    break_duration_minutes = excluded.break_duration_minutes;

-- 5. Seed a mix of leave requests (pending, approved, rejected)
with employee_lookup as (
  select id, employee_id
  from public.employees
),
leave_rows as (
  select req.employee_id,
         (current_date + req.start_offset)::date as start_date,
         (current_date + req.start_offset + req.duration_days - 1)::date as end_date,
         req.duration_days as days_requested,
         req.leave_type,
         req.reason,
         req.status,
         approver.id as approved_by,
         case
           when req.status = 'approved' then now()
           when req.status = 'rejected' then now()
           else null
         end as approved_at,
         case
           when req.status = 'rejected' then 'Manager requires presence on selected day'
           else null
         end as rejection_reason
  from (
    select el.id as employee_id,
           lr.start_offset,
           lr.duration_days,
           lr.leave_type,
           lr.reason,
           lr.status,
           lr.approver_code
    from employee_lookup el
    join (
      values
        ('EMP-D94828A3B6', 21, 3, 'vacation', 'Family trip', 'approved', 'EMP-4D9CC7E06E'),
        ('EMP-922EBCAB22', 7, 2, 'sick', 'Seasonal illness', 'pending', null),
        ('EMP-4D9CC7E06E', 14, 1, 'personal', 'School appointment', 'rejected', 'EMP-D94828A3B6')
    ) as lr(emp_code, start_offset, duration_days, leave_type, reason, status, approver_code)
      on lr.emp_code = el.employee_id
  ) as req
  left join employee_lookup approver on approver.employee_id = req.approver_code
)
insert into public.leave_requests (
  employee_id,
  leave_type,
  start_date,
  end_date,
  days_requested,
  reason,
  status,
  approved_by,
  approved_at,
  rejection_reason
)
select lr.employee_id,
       lr.leave_type,
       lr.start_date,
       lr.end_date,
       lr.days_requested,
       lr.reason,
       lr.status,
       lr.approved_by,
       lr.approved_at,
       lr.rejection_reason
from leave_rows lr
where not exists (
  select 1
  from public.leave_requests existing
  where existing.employee_id = lr.employee_id
    and existing.start_date = lr.start_date
    and existing.leave_type = lr.leave_type
);

commit;
