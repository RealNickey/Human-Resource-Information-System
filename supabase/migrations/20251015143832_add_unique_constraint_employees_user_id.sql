-- migration: add unique constraint on employees.user_id
-- purpose: prevent duplicate employee profiles referencing the same auth user

begin;

alter table public.employees
  add constraint employees_user_id_key unique (user_id);

commit;
