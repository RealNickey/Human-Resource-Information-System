-- migration: add dummy data for testing
-- purpose: populate database with sample employees, attendance, leave requests, etc.

begin;

-- Insert departments
insert into public.departments (name, description) values
  ('Engineering', 'Software development and technical teams'),
  ('Human Resources', 'HR management and employee relations'),
  ('Marketing', 'Marketing and brand management'),
  ('Sales', 'Sales and customer relations')
on conflict (name) do nothing;

-- Note: In a real implementation, you would need actual auth.users entries
-- This migration assumes you have already created users in your Supabase Auth
-- and you would need to update the user_id values below with actual UUIDs

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
  emergency_contact_phone
)
select
  u.id,
  seed.employee_id,
  seed.first_name,
  seed.last_name,
  seed.email,
  seed.date_of_birth,
  seed.date_of_joining,
  d.id,
  seed.position,
  seed.phone,
  seed.address,
  seed.emergency_contact_name,
  seed.emergency_contact_phone
from (
  values
    ('00000000-0000-0000-0000-000000000001', 'EMP001', 'John', 'Smith', 'john.smith@company.com', '1990-05-15'::date, '2020-01-15'::date, 'Engineering', 'Senior Software Engineer', '+1-555-0101', '123 Main St, City, ST 12345', 'Jane Smith', '+1-555-0102'),
    ('00000000-0000-0000-0000-000000000002', 'EMP002', 'Sarah', 'Johnson', 'sarah.johnson@company.com', '1988-08-22'::date, '2019-03-20'::date, 'Engineering', 'Software Engineer', '+1-555-0201', '456 Oak Ave, City, ST 12345', 'Mike Johnson', '+1-555-0202'),
    ('00000000-0000-0000-0000-000000000003', 'EMP003', 'Michael', 'Brown', 'michael.brown@company.com', '1992-03-10'::date, '2021-06-01'::date, 'Engineering', 'Junior Software Engineer', '+1-555-0301', '789 Pine Rd, City, ST 12345', 'Emily Brown', '+1-555-0302'),
    ('00000000-0000-0000-0000-000000000004', 'EMP004', 'Emily', 'Davis', 'emily.davis@company.com', '1985-11-30'::date, '2018-09-15'::date, 'Human Resources', 'HR Manager', '+1-555-0401', '321 Elm St, City, ST 12345', 'David Davis', '+1-555-0402'),
    ('00000000-0000-0000-0000-000000000005', 'EMP005', 'David', 'Wilson', 'david.wilson@company.com', '1987-07-18'::date, '2019-11-10'::date, 'Marketing', 'Marketing Specialist', '+1-555-0501', '654 Maple Dr, City, ST 12345', 'Lisa Wilson', '+1-555-0502')
) as seed(user_id, employee_id, first_name, last_name, email, date_of_birth, date_of_joining, department_name, position, phone, address, emergency_contact_name, emergency_contact_phone)
join auth.users u on u.id = seed.user_id::uuid
left join public.departments d on d.name = seed.department_name
on conflict (employee_id) do nothing;

-- Insert attendance records for the last 30 days
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
  e.id,
  current_date - (gs.day_offset || ' days')::interval,
  (current_date - (gs.day_offset || ' days')::interval + '09:00:00'::time)::timestamptz,
  (current_date - (gs.day_offset || ' days')::interval + '17:30:00'::time)::timestamptz,
  60,
  7.5,
  case
    when extract(dow from current_date - (gs.day_offset || ' days')::interval) in (0, 6) then 'holiday'
    when random() < 0.05 then 'sick'
    when random() < 0.02 then 'absent'
    else 'present'
  end,
  null
from public.employees e
cross join generate_series(1, 30) as gs(day_offset)
on conflict (employee_id, date) do nothing;

-- Insert leave requests
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
  e.id,
  (array['vacation', 'sick', 'personal'])[floor(random() * 3 + 1)],
  current_date + (floor(random() * 30) || ' days')::interval,
  current_date + (floor(random() * 30 + 2) || ' days')::interval,
  floor(random() * 5 + 1)::integer,
  case floor(random() * 3)
    when 0 then 'Family vacation'
    when 1 then 'Medical appointment'
    else 'Personal matters'
  end,
  (array['pending', 'approved', 'rejected'])[floor(random() * 3 + 1)]::text,
  null,
  null
from public.employees e
where e.position != 'HR Manager'
limit 10
on conflict do nothing;

-- Insert salary records
insert into public.salary_records (
  employee_id,
  base_salary,
  effective_date,
  salary_type,
  currency
)
select
  e.id,
  case
    when e.position like '%Senior%' then 120000
    when e.position like '%Manager%' then 95000
    when e.position like '%Junior%' then 65000
    else 85000
  end,
  e.date_of_joining::date,
  'annual',
  'USD'
from public.employees e
on conflict (employee_id, effective_date) do nothing;

-- Insert performance evaluations
insert into public.performance_evaluations (
  employee_id,
  evaluation_period_start,
  evaluation_period_end,
  overall_rating,
  performance_score,
  goals_achieved,
  total_goals,
  evaluator_id,
  comments
)
select
  e.id,
  current_date - interval '3 months',
  current_date - interval '1 day',
  (random() * 2 + 3)::numeric(3,2),
  (random() * 30 + 70)::numeric(6,2),
  floor(random() * 5 + 3)::integer,
  8,
  null,
  'Good performance during the evaluation period. Continues to meet expectations.'
from public.employees e
limit 5
on conflict do nothing;

commit;
