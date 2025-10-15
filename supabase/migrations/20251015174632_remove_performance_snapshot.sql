-- migration: drop latest_performance view
-- purpose: retire outdated performance snapshot helper after refactor

begin;

drop view if exists public.latest_performance;

commit;
