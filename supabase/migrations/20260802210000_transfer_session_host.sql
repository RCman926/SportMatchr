-- Allow host to hand off hosting to another member
create or replace function public.transfer_session_host(
  p_session_id uuid,
  p_new_host_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur_host uuid;
  sess_status text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in required');
  end if;

  select host_id, status into cur_host, sess_status
  from public.sessions
  where id = p_session_id;

  if cur_host is null then
    return jsonb_build_object('ok', false, 'error', 'Session not found');
  end if;

  if cur_host <> uid then
    return jsonb_build_object('ok', false, 'error', 'Only the host can transfer');
  end if;

  if sess_status not in ('open', 'full') then
    return jsonb_build_object('ok', false, 'error', 'Session is closed');
  end if;

  if p_new_host_id = uid then
    return jsonb_build_object('ok', false, 'error', 'Already the host');
  end if;

  if not exists (
    select 1 from public.session_members
    where session_id = p_session_id and user_id = p_new_host_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'New host must be in the game');
  end if;

  update public.sessions
  set host_id = p_new_host_id
  where id = p_session_id;

  update public.session_members
  set role = 'player'
  where session_id = p_session_id and user_id = uid;

  update public.session_members
  set role = 'host'
  where session_id = p_session_id and user_id = p_new_host_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.transfer_session_host(uuid, uuid) to authenticated;
