-- Host labels for who a game is for + host can remove a player

alter table public.sessions
  add column if not exists play_mix text not null default 'mixed';

alter table public.sessions
  add column if not exists age_group text not null default 'any';

alter table public.sessions
  add column if not exists skill_level text not null default 'any';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sessions_play_mix_check'
  ) then
    alter table public.sessions
      add constraint sessions_play_mix_check
      check (play_mix in ('mixed', 'female_only'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sessions_age_group_check'
  ) then
    alter table public.sessions
      add constraint sessions_age_group_check
      check (age_group in ('any', '18_24', '25_34', '35_44', '45_plus'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sessions_skill_level_check'
  ) then
    alter table public.sessions
      add constraint sessions_skill_level_check
      check (skill_level in ('any', 'beginner', 'intermediate', 'expert'));
  end if;
end $$;

create or replace function public.remove_session_member(
  p_session_id uuid,
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur_host uuid;
  sess_status text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in required');
  end if;

  select host_id, status into cur_host, sess_status
  from public.sessions
  where id = p_session_id;

  if cur_host is null then
    return jsonb_build_object('ok', false, 'error', 'Session not found');
  end if;

  if cur_host <> uid then
    return jsonb_build_object('ok', false, 'error', 'Only the host can remove players');
  end if;

  if p_member_id = uid then
    return jsonb_build_object('ok', false, 'error', 'Transfer host first if you want to leave');
  end if;

  if not exists (
    select 1 from public.session_members
    where session_id = p_session_id and user_id = p_member_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Player is not in this game');
  end if;

  delete from public.session_members
  where session_id = p_session_id and user_id = p_member_id;

  if sess_status = 'full' then
    update public.sessions set status = 'open' where id = p_session_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.remove_session_member(uuid, uuid) from public, anon;
grant execute on function public.remove_session_member(uuid, uuid) to authenticated;
