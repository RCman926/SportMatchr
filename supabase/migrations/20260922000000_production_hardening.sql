-- Production hardening:
-- 1. Remove accidental API access to privileged functions.
-- 2. Expose a deliberately narrow, read-only session feed to guests.

revoke all on function public.credit_rematch_votes(uuid, boolean)
  from public, anon;
grant execute on function public.credit_rematch_votes(uuid, boolean)
  to authenticated;

revoke all on function public.invite_session_member(uuid, uuid)
  from public, anon;
grant execute on function public.invite_session_member(uuid, uuid)
  to authenticated;

revoke all on function public.transfer_session_host(uuid, uuid)
  from public, anon;
grant execute on function public.transfer_session_host(uuid, uuid)
  to authenticated;

revoke all on function public.remove_session_member(uuid, uuid)
  from public, anon;
grant execute on function public.remove_session_member(uuid, uuid)
  to authenticated;

-- Trust counters must not be directly writable by app users. Attendance should
-- only be credited through a future session-scoped server operation.
revoke all on function public.increment_profile_counter(uuid, text)
  from public, anon, authenticated;

-- Trigger functions are invoked by Postgres, never over the Data API.
revoke all on function public.protect_profile_trust_columns()
  from public, anon, authenticated;

create or replace function public.list_public_sessions(
  p_sport text default null
)
returns table (
  id uuid,
  sport text,
  title text,
  description text,
  location text,
  court_id text,
  starts_at timestamptz,
  max_players integer,
  status text,
  recurring_rule text,
  intensity text,
  play_mix text,
  age_group text,
  skill_level text,
  host_name text,
  member_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.sport,
    s.title,
    s.description,
    s.location,
    s.court_id,
    s.starts_at,
    s.max_players,
    s.status,
    s.recurring_rule,
    s.intensity,
    s.play_mix,
    s.age_group,
    s.skill_level,
    p.display_name as host_name,
    count(sm.user_id) as member_count
  from public.sessions s
  join public.profiles p on p.id = s.host_id
  left join public.session_members sm on sm.session_id = s.id
  where s.status = 'open'
    and s.starts_at >= now() - interval '6 hours'
    and (p_sport is null or s.sport = p_sport)
  group by s.id, p.display_name
  order by s.starts_at asc;
$$;

revoke all on function public.list_public_sessions(text) from public;
grant execute on function public.list_public_sessions(text) to anon, authenticated;
