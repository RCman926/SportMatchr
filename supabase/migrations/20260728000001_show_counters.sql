-- Increment show / no-show counters on profiles (called from app after host marks attendance)
create or replace function public.increment_profile_counter(
  target_user uuid,
  counter text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if counter = 'shows' then
    update public.profiles set shows = shows + 1, games_played = games_played + 1, updated_at = now()
    where id = target_user;
  elsif counter = 'no_shows' then
    update public.profiles set no_shows = no_shows + 1, updated_at = now()
    where id = target_user;
  end if;
end;
$$;

revoke all on function public.increment_profile_counter(uuid, text) from public;
grant execute on function public.increment_profile_counter(uuid, text) to authenticated;
