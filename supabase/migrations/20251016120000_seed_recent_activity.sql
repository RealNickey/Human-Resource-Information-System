-- migration: seed recent activity for key dashboards
-- purpose: generate realistic attendance, leave, and salary data for the existing team
-- scope: ensures manager profile exists, backfills salary history, attendance, and leave requests for the last two weeks

begin;

-- Ensure the manager profile exists so seeded data can reference it
with manager_user as (
  select u.id as user_id,
         coalesce(u.raw_user_meta_data->>'email', 'manager@example.com') as email
  from auth.users u
  where coalesce(u.raw_user_meta_data->>'role', '') = 'manager'
  order by u.created_at asc
  limit 1
),
manager_existing as (
  select e.id, e.user_id
  from public.employees e
  join manager_user mu on mu.user_id = e.user_id
),
manager_insert as (
  insert into public.employees (
    user_id,
    employee_id,
    first_name,
    last_name,
    email,
    date_of_birth,
    date_of_joining,
    department_id,
    position,
    phone,
    address,
    emergency_contact_name,
    emergency_contact_phone,
    annual_leave_remaining
  )
  select
    mu.user_id,
    'EMP-MANAGER-001',
    'Morgan',
    'Hart',
    mu.email,
    date '1984-04-14',
    (current_date - interval '5 years')::date,
    coalesce(
      (select id from public.departments where name ilike 'Human Resources' order by id limit 1),
      (select id from public.departments order by id limit 1)
    ),
    'HR Manager',
    '+1-555-3030',
    '500 Corporate Way, Suite 100, Springfield, ST 12345',
    'Jordan Hart',
    '+1-555-3031',
    20
  from manager_user mu
  where not exists (select 1 from manager_existing)
  returning id, user_id
),
manager_target as (
  select id, user_id from manager_insert
  union all
  select id, user_id from manager_existing
)
update public.departments d
set manager_id = mt.id
from manager_target mt
where d.name ilike 'Human Resources'
  and mt.id is not null
  and (d.manager_id is distinct from mt.id);

-- Baseline salary records at date of joining
with target_employees as (
  select
    e.id,
    coalesce(e.date_of_joining, (current_date - interval '365 days'))::date as joined_on,
    coalesce(e.position, '') as position
  from public.employees e
)
insert into public.salary_records (
  employee_id,
  base_salary,
  effective_date,
  salary_type,
  currency
)
select
  te.id,
  case
    when te.position ilike '%manager%' then 128000
    when te.position ilike '%senior%' then 108000
    when te.position ilike '%analyst%' then 86000
    else 78000
  end,
  te.joined_on,
  'annual',
  'USD'
from target_employees te
on conflict (employee_id, effective_date)
do update set
  base_salary = excluded.base_salary,
  salary_type = excluded.salary_type,
  currency = excluded.currency;

-- Recent salary adjustments roughly one month ago
with target_employees as (
  select
    e.id,
    coalesce(e.position, '') as position,
    greatest(
      (current_date - interval '30 days')::date,
      coalesce(e.date_of_joining, (current_date - interval '180 days'))::date
    ) as effective_on
  from public.employees e
)
insert into public.salary_records (
  employee_id,
  base_salary,
  effective_date,
  salary_type,
  currency
)
select
  te.id,
  case
    when te.position ilike '%manager%' then 133000
    when te.position ilike '%senior%' then 112500
    when te.position ilike '%analyst%' then 89500
    else 81500
  end,
  te.effective_on,
  'annual',
  'USD'
from target_employees te
on conflict (employee_id, effective_date)
do update set
  base_salary = excluded.base_salary,
  salary_type = excluded.salary_type,
  currency = excluded.currency;

-- Attendance records for the last 14 days with realistic variety
with target_employees as (
  select
    e.id,
    row_number() over (order by e.id) - 1 as idx
  from public.employees e
),
attendance_source as (
  select
    te.id as employee_id,
    te.idx,
    gs,
    (current_date - gs) as work_date,
    extract(isodow from current_date - gs)::int as dow,
    3 + (te.idx % 4) as sick_offset,
    1 + (te.idx % 3) as partial_offset,
    8 + (te.idx % 2) as vacation_start_offset,
    7 + (te.idx % 2) as vacation_end_offset
  from target_employees te
  cross join generate_series(0, 13) as gs
),
attendance_enriched as (
  select
    employee_id,
    work_date,
    case
      when dow in (6, 7) then 'holiday'
      when gs = sick_offset then 'sick'
      when gs between vacation_end_offset and vacation_start_offset then 'absent'
      when gs = partial_offset then 'partial'
      else 'present'
    end as status,
    case
      when dow in (6, 7) or gs = sick_offset or gs between vacation_end_offset and vacation_start_offset then null
      when gs = partial_offset then make_timestamptz(extract(year from work_date)::int, extract(month from work_date)::int, extract(day from work_date)::int, 10, 0, 0, 'UTC')
      else make_timestamptz(extract(year from work_date)::int, extract(month from work_date)::int, extract(day from work_date)::int, 9, 0, 0, 'UTC')
    end as check_in_time,
    case
      when dow in (6, 7) or gs = sick_offset or gs between vacation_end_offset and vacation_start_offset then null
      when gs = partial_offset then make_timestamptz(extract(year from work_date)::int, extract(month from work_date)::int, extract(day from work_date)::int, 15, 0, 0, 'UTC')
      else make_timestamptz(extract(year from work_date)::int, extract(month from work_date)::int, extract(day from work_date)::int, 17, 30, 0, 'UTC')
    end as check_out_time,
    case
      when dow in (6, 7) or gs = sick_offset or gs between vacation_end_offset and vacation_start_offset then 0
      when gs = partial_offset then 30
      else 45
    end as break_minutes,
    case
      when dow in (6, 7) or gs = sick_offset or gs between vacation_end_offset and vacation_start_offset then null
      when gs = partial_offset then 5.0
      else 7.5
    end as total_hours,
    case
      when dow in (6, 7) then 'Weekend'
      when gs = sick_offset then 'Out sick with doctor note'
      when gs between vacation_end_offset and vacation_start_offset then 'Approved vacation day'
      when gs = partial_offset then 'Left early for appointment'
      else 'On-site shift'
    end as notes
  from attendance_source
)
insert into public.attendance_records (
  employee_id,
  date,
  check_in_time,
  check_out_time,
  break_duration_minutes,
  total_hours,
  status,
  notes
)
select
  employee_id,
  work_date,
  check_in_time,
  check_out_time,
  break_minutes,
  total_hours,
  status,
  notes
from attendance_enriched
on conflict (employee_id, date)
do update set
  check_in_time = excluded.check_in_time,
  check_out_time = excluded.check_out_time,
  break_duration_minutes = excluded.break_duration_minutes,
  total_hours = excluded.total_hours,
  status = excluded.status,
  notes = excluded.notes;

-- Approved sick leave aligned with the seeded sick days
with target_employees as (
  select
    e.id,
    row_number() over (order by e.id) - 1 as idx
  from public.employees e
),
manager_ref as (
  select e.id as approver_id
  from public.employees e
  join auth.users u on u.id = e.user_id
  where coalesce(u.raw_user_meta_data->>'role', '') = 'manager'
  order by e.created_at desc
  limit 1
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
  approved_at
)
select
  te.id,
  'sick',
  current_date - ((3 + (te.idx % 4))::int),
  current_date - ((3 + (te.idx % 4))::int),
  1,
  'Recovering from flu symptoms',
  'approved',
  (select approver_id from manager_ref),
  (current_timestamp - ((3 + (te.idx % 4))::int * interval '1 day'))
from target_employees te
where not exists (
  select 1
  from public.leave_requests lr
  where lr.employee_id = te.id
    and lr.start_date = current_date - ((3 + (te.idx % 4))::int)
    and lr.leave_type = 'sick'
);

-- Approved vacation blocks so dashboards show time away
with target_employees as (
  select
    e.id,
    row_number() over (order by e.id) - 1 as idx
  from public.employees e
),
manager_ref as (
  select e.id as approver_id
  from public.employees e
  join auth.users u on u.id = e.user_id
  where coalesce(u.raw_user_meta_data->>'role', '') = 'manager'
  order by e.created_at desc
  limit 1
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
  approved_at
)
select
  te.id,
  'vacation',
  current_date - ((8 + (te.idx % 2))::int),
  current_date - ((7 + (te.idx % 2))::int),
  ((8 + (te.idx % 2)) - (7 + (te.idx % 2)) + 1),
  'Family getaway approved by manager',
  'approved',
  (select approver_id from manager_ref),
  (current_timestamp - ((7 + (te.idx % 2))::int * interval '1 day'))
from target_employees te
where not exists (
  select 1
  from public.leave_requests lr
  where lr.employee_id = te.id
    and lr.start_date = current_date - ((8 + (te.idx % 2))::int)
    and lr.leave_type = 'vacation'
);

-- Adjust leave balances after the two approved vacation days
update public.employees e
set annual_leave_remaining = least(coalesce(e.annual_leave_remaining, 20), 20) - 2
where e.annual_leave_remaining >= 20;

commit;
