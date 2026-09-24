-- User-suggested free places the catalog doesn't have yet
create table if not exists public.place_suggestions (
  id uuid primary key default gen_random_uuid(),
  suggested_by uuid references auth.users(id) on delete set null,
  name text not null,
  neighbourhood text,
  notes text,
  sport text,
  city text not null default 'Ottawa',
  status text not null default 'new' check (status in ('new', 'reviewed', 'added', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.place_suggestions enable row level security;

create policy "Anyone authenticated can suggest a place"
  on public.place_suggestions for insert
  to authenticated
  with check (true);

create policy "Users can read their own suggestions"
  on public.place_suggestions for select
  to authenticated
  using (suggested_by = auth.uid());

grant select, insert on public.place_suggestions to authenticated;
