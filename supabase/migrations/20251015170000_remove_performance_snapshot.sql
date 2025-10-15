-- migration: remove performance snapshot view
-- purpose: drop latest_performance helper now that UI no longer uses it

begin;

drop view if exists public.latest_performance;

commit;
