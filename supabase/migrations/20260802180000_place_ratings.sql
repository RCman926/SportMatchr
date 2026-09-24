-- Community 1–5 star ratings for free places (catalog place_id text)

create table if not exists public.place_ratings (
  place_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (place_id, user_id)
);

create index if not exists place_ratings_place_id_idx on public.place_ratings (place_id);

alter table public.place_ratings enable row level security;

drop policy if exists "Anyone can read place ratings" on public.place_ratings;
create policy "Anyone can read place ratings"
  on public.place_ratings for select
  to anon, authenticated
  using (true);

drop policy if exists "Users rate places as themselves" on public.place_ratings;
create policy "Users rate places as themselves"
  on public.place_ratings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users update own place ratings" on public.place_ratings;
create policy "Users update own place ratings"
  on public.place_ratings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users delete own place ratings" on public.place_ratings;
create policy "Users delete own place ratings"
  on public.place_ratings for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.place_ratings to anon, authenticated;
grant insert, update, delete on public.place_ratings to authenticated;

-- Aggregates for home / map lists
create or replace function public.place_rating_stats(place_ids text[])
returns table (
  place_id text,
  avg_stars numeric,
  rating_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.place_id,
    round(avg(r.stars)::numeric, 1) as avg_stars,
    count(*)::int as rating_count
  from public.place_ratings r
  where r.place_id = any (place_ids)
  group by r.place_id;
$$;

revoke all on function public.place_rating_stats(text[]) from public;
grant execute on function public.place_rating_stats(text[]) to anon, authenticated;
