-- Hangout: signed-in users only (no guest peek)
drop policy if exists "Hangout readable by anyone" on public.messages;

create policy "Hangout readable by signed-in users"
  on public.messages for select
  to authenticated
  using (thread_id = 'hangout:ottawa');
