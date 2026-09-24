-- Track anyone currently using the app (guests + signed-in), not only "looking for a game"
create table if not exists public.app_presence (
  client_id text primary key,
  user_id uuid references public.profiles (id) on delete set null,
  last_seen_at timestamptz not null default now()
);

create index if not exists app_presence_last_seen_idx
  on public.app_presence (last_seen_at desc);

alter table public.app_presence enable row level security;

create policy "Presence upsert by anyone"
  on public.app_presence for insert
  to anon, authenticated
  with check (true);

create policy "Presence update by anyone"
  on public.app_presence for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Presence select by anyone"
  on public.app_presence for select
  to anon, authenticated
  using (true);

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create or replace function public.online_now_count(within_seconds int default 120)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.app_presence
  where last_seen_at > now() - make_interval(secs => greatest(within_seconds, 30));
$$;

revoke all on function public.online_now_count(int) from public;
grant execute on function public.online_now_count(int) to anon, authenticated;

create or replace function public.touch_presence(p_client_id text, p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_client_id is null or length(trim(p_client_id)) < 8 then
    return;
  end if;

  insert into public.app_presence (client_id, user_id, last_seen_at)
  values (p_client_id, p_user_id, now())
  on conflict (client_id) do update
    set last_seen_at = now(),
        user_id = coalesce(excluded.user_id, public.app_presence.user_id);

  if p_user_id is not null then
    update public.profiles
      set last_seen_at = now(),
          updated_at = now()
      where id = p_user_id;
  end if;
end;
$$;

revoke all on function public.touch_presence(text, uuid) from public;
grant execute on function public.touch_presence(text, uuid) to anon, authenticated;
