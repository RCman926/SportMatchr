-- Profile face photos for safer meetups
alter table public.profiles
  add column if not exists avatar_url text;
