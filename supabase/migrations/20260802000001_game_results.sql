-- Optional self-reported W/L (not a ranked ladder)
alter table public.session_feedback
  add column if not exists result text
    check (result is null or result in ('win', 'loss', 'draw', 'fun')),
  add column if not exists sport text;

alter table public.profiles
  add column if not exists wins int not null default 0,
  add column if not exists losses int not null default 0,
  add column if not exists draws int not null default 0,
  add column if not exists result_log jsonb not null default '[]'::jsonb;

-- Upsert feedback needs update
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'session_feedback'
      and policyname = 'Users update own feedback'
  ) then
    create policy "Users update own feedback"
      on public.session_feedback for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
