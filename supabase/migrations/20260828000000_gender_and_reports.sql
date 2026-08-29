-- Self-reported gender identity + a reports table for trust & safety.

-- Optional, self-reported gender. Powers women-only games (self-declared;
-- the real enforcement is face-photo recognition + reporting at the court).
alter table public.profiles
  add column if not exists gender text
    check (gender in ('woman', 'man', 'nonbinary', 'unspecified'));

-- Reports: players/hosts flagging a session or another player.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('session', 'player')),
  target_id text not null,
  reason text not null,
  details text,
  created_at timestamptz default now()
);

create index if not exists reports_target_idx on public.reports (target_type, target_id);

alter table public.reports enable row level security;

drop policy if exists "Users can file reports" on public.reports;
create policy "Users can file reports"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can read own reports" on public.reports;
create policy "Users can read own reports"
  on public.reports for select
  to authenticated
  using (auth.uid() = reporter_id);
