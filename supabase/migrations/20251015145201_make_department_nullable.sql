-- migration: make department assignment optional
-- purpose: allow employees to exist without an initial department mapping

begin;

alter table public.employees
  alter column department_id drop not null;

update public.employees
set department_id = null
where department_id is null;

comment on column public.employees.department_id is 'Optional department assignment - can be set by manager later';

commit;
