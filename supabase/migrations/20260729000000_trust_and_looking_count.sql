-- Public count of people currently looking (solos presence)
create or replace function public.looking_now_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.solos
  where available_until > now();
$$;

revoke all on function public.looking_now_count() from public;
grant execute on function public.looking_now_count() to anon, authenticated;

-- Aggregate trust signals (no free-text reviews)
alter table public.profiles
  add column if not exists rematch_yes int default 0,
  add column if not exists rematch_total int default 0;

alter table public.session_feedback
  add column if not exists showed_up boolean;

-- Realtime so clients can refresh the looking pulse
do $$
begin
  begin
    alter publication supabase_realtime add table public.solos;
  exception
    when duplicate_object then null;
  end;
end $$;
