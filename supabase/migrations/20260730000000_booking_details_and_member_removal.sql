-- Booking-window updates: richer session details + host ability to remove players.
--
-- The app currently folds gender/age/skill/notes into sessions.description so it
-- works without a schema change. These optional columns let you move to structured,
-- filterable storage later without breaking existing rows.

alter table public.sessions
  add column if not exists gender_play text,   -- 'all' | 'women' | 'mixed'
  add column if not exists age_group text,     -- 'all' | 'teens' | 'ya' | 'adult' | 'senior'
  add column if not exists skill_level text;   -- 'all' | 'beginner' | 'intermediate' | 'advanced'

-- Let a host remove other players from their own session.
-- (Existing policies only allowed updating show_status, not deletion.)
drop policy if exists "Hosts can remove members" on public.session_members;
create policy "Hosts can remove members"
  on public.session_members for delete
  to authenticated
  using (
    role <> 'host'
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and s.host_id = auth.uid()
    )
  );
