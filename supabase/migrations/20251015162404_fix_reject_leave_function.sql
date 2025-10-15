-- migration: correct reject_leave helper
-- purpose: ensure rejection updates status explicitly and keeps metadata in sync

begin;

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
