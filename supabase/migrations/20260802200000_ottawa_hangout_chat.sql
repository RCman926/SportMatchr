-- Ottawa Hangout: open city chat (not tied to a session)
-- thread_id = 'hangout:ottawa'

create policy "Hangout readable by anyone"
  on public.messages for select
  to anon, authenticated
  using (thread_id = 'hangout:ottawa');

create policy "Hangout send by signed-in users"
  on public.messages for insert
  to authenticated
  with check (
    thread_id = 'hangout:ottawa'
    and sender_id = (select auth.uid())
    and char_length(coalesce(body, '')) between 1 and 500
  );
