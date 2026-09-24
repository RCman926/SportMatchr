-- Soft-launch security + Looking meetup helpers
-- Message membership RLS, lock trust columns, rematch RPC, presence bind,
-- place_suggestions, avatars storage, reports, invite member, expire helpers

-- ---------------------------------------------------------------------------
-- Messages: only session members (thread_id = session uuid text)
-- ---------------------------------------------------------------------------
drop policy if exists "Messages readable by authenticated" on public.messages;
drop policy if exists "Users can send messages" on public.messages;

create policy "Members can read session messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.session_members sm
      where sm.session_id::text = thread_id
        and sm.user_id = (select auth.uid())
    )
  );

create policy "Members can send session messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.session_members sm
      where sm.session_id::text = thread_id
        and sm.user_id = (select auth.uid())
    )
  );

-- Realtime for chat
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.messages;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Session members: leave (delete own row)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can leave sessions" on public.session_members;
create policy "Users can leave sessions"
  on public.session_members for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Lock profile trust / verification columns from client self-update
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_trust_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Block client self-forgery of verification / phone / rematch trust.
  -- Shows / W–L / games_played may still be updated by the owner (app paths);
  -- rematch accrues only via credit_rematch_votes SECURITY DEFINER.
  if tg_op = 'UPDATE' and (select auth.uid()) is not null and new.id = (select auth.uid()) then
    new.verification := old.verification;
    new.phone := old.phone;
    new.rematch_yes := old.rematch_yes;
    new.rematch_total := old.rematch_total;
    new.rating := old.rating;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_trust on public.profiles;
create trigger protect_profile_trust
  before update on public.profiles
  for each row execute function public.protect_profile_trust_columns();

-- ---------------------------------------------------------------------------
-- Rematch credit RPC (membership-checked)
-- ---------------------------------------------------------------------------
create or replace function public.credit_rematch_votes(
  p_session_id uuid,
  p_would_play_again boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  other_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.session_members
    where session_id = p_session_id and user_id = uid
  ) then
    raise exception 'not a session member';
  end if;

  for other_id in
    select user_id from public.session_members
    where session_id = p_session_id and user_id <> uid
  loop
    update public.profiles
      set rematch_total = coalesce(rematch_total, 0) + 1,
          rematch_yes = coalesce(rematch_yes, 0) + case when p_would_play_again then 1 else 0 end,
          updated_at = now()
      where id = other_id;
  end loop;
end;
$$;

revoke all on function public.credit_rematch_votes(uuid, boolean) from public;
grant execute on function public.credit_rematch_votes(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Invite other Looking player into host's session
-- ---------------------------------------------------------------------------
create or replace function public.invite_session_member(
  p_session_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.sessions s
    where s.id = p_session_id and s.host_id = uid and s.status in ('open', 'full')
  ) then
    raise exception 'not host of open session';
  end if;

  insert into public.session_members (session_id, user_id, role, show_status)
  values (p_session_id, p_user_id, 'player', 'joined')
  on conflict (session_id, user_id) do nothing;
end;
$$;

revoke all on function public.invite_session_member(uuid, uuid) from public;
grant execute on function public.invite_session_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Harden increment_profile_counter — host of a shared session only
-- ---------------------------------------------------------------------------
create or replace function public.increment_profile_counter(
  target_user uuid,
  counter text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.session_members a
    join public.session_members b on a.session_id = b.session_id
    where a.user_id = uid and b.user_id = target_user
  ) and uid <> target_user then
    raise exception 'not allowed';
  end if;

  if counter = 'shows' then
    update public.profiles
      set shows = coalesce(shows, 0) + 1,
          games_played = coalesce(games_played, 0) + 1,
          updated_at = now()
      where id = target_user;
  elsif counter = 'no_shows' then
    update public.profiles
      set no_shows = coalesce(no_shows, 0) + 1,
          updated_at = now()
      where id = target_user;
  end if;
end;
$$;

revoke all on function public.increment_profile_counter(uuid, text) from public;
revoke all on function public.increment_profile_counter(uuid, text) from anon;
grant execute on function public.increment_profile_counter(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Presence: bind user_id to auth.uid(); guests may only set null user_id
-- ---------------------------------------------------------------------------
create or replace function public.touch_presence(p_client_id text, p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  bound uuid;
begin
  if p_client_id is null or length(trim(p_client_id)) < 8 then
    return;
  end if;

  bound := case when uid is not null then uid else null end;

  insert into public.app_presence (client_id, user_id, last_seen_at)
  values (p_client_id, bound, now())
  on conflict (client_id) do update
    set last_seen_at = now(),
        user_id = coalesce(bound, public.app_presence.user_id);

  if bound is not null then
    update public.profiles
      set last_seen_at = now(),
          updated_at = now()
      where id = bound;
  end if;
end;
$$;

revoke all on function public.touch_presence(text, uuid) from public;
grant execute on function public.touch_presence(text, uuid) to anon, authenticated;

-- Revoke handle_new_user from API roles if present
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'handle_new_user'
  ) then
    execute 'revoke all on function public.handle_new_user() from public, anon, authenticated';
  end if;
exception when others then
  null;
end $$;

-- ---------------------------------------------------------------------------
-- place_suggestions: force suggested_by + status
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone authenticated can suggest a place" on public.place_suggestions;
create policy "Authenticated users suggest places as themselves"
  on public.place_suggestions for insert
  to authenticated
  with check (
    suggested_by = (select auth.uid())
    and status = 'new'
  );

-- ---------------------------------------------------------------------------
-- Avatars storage policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;
drop policy if exists "Users can delete own avatar" on storage.objects;

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  session_id uuid references public.sessions (id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "Users can file reports" on public.reports;
create policy "Users can file reports"
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

drop policy if exists "Users can read own reports" on public.reports;
create policy "Users can read own reports"
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()));

grant select, insert on public.reports to authenticated;

-- Ensure rematch columns exist
alter table public.profiles
  add column if not exists rematch_yes int default 0,
  add column if not exists rematch_total int default 0;
