-- SportMatchr core loop schema
-- Auth: profiles tied to auth.users
-- Sessions + join, solos presence, chat, show-up / no-show

create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  handle text unique,
  bio text default '',
  city text default 'Ottawa',
  neighbourhood text default 'Glebe / Centretown',
  sports text[] default array['Pickleball']::text[],
  skill text default 'Any' check (skill in ('Beginner', 'Intermediate', 'Advanced', 'Any')),
  intensity text default 'casual' check (intensity in ('casual', 'competitive', 'any')),
  verification text default 'none' check (verification in ('none', 'phone', 'photo', 'id')),
  phone text,
  games_played int default 0,
  rating numeric(3,2) default 5.0,
  streak_days int default 0,
  shows int default 0,
  no_shows int default 0,
  looking_now boolean default false,
  preferred_courts text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Sessions (scheduled / recurring pickups)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  sport text not null default 'Pickleball',
  title text not null,
  description text default '',
  location text not null,
  court_id text,
  starts_at timestamptz not null,
  max_players int not null default 8,
  recurring_rule text,
  intensity text default 'casual',
  status text default 'open' check (status in ('open', 'full', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

create index if not exists sessions_starts_at_idx on public.sessions (starts_at);
create index if not exists sessions_sport_idx on public.sessions (sport);

alter table public.sessions enable row level security;

create policy "Sessions readable by authenticated"
  on public.sessions for select
  to authenticated
  using (true);

create policy "Hosts can create sessions"
  on public.sessions for insert
  to authenticated
  with check (auth.uid() = host_id);

create policy "Hosts can update own sessions"
  on public.sessions for update
  to authenticated
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

-- Session members (join)
create table if not exists public.session_members (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text default 'player' check (role in ('host', 'player')),
  show_status text default 'joined' check (show_status in ('joined', 'here', 'showed', 'no_show')),
  joined_at timestamptz default now(),
  primary key (session_id, user_id)
);

alter table public.session_members enable row level security;

create policy "Members readable by authenticated"
  on public.session_members for select
  to authenticated
  using (true);

create policy "Users can join sessions"
  on public.session_members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own membership"
  on public.session_members for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Hosts can update member show_status"
  on public.session_members for update
  to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.host_id = auth.uid()
    )
  );

-- Solos presence (looking now)
create table if not exists public.solos (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  sport text not null default 'Pickleball',
  skill text default 'Any',
  looking_for text default '',
  available_until timestamptz not null,
  lat double precision,
  lng double precision,
  updated_at timestamptz default now()
);

alter table public.solos enable row level security;

create policy "Solos readable by authenticated"
  on public.solos for select
  to authenticated
  using (available_until > now());

create policy "Users upsert own solo"
  on public.solos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own solo"
  on public.solos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own solo"
  on public.solos for delete
  to authenticated
  using (auth.uid() = user_id);

-- Chat messages (session or solo thread)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists messages_thread_idx on public.messages (thread_id, created_at);

alter table public.messages enable row level security;

create policy "Messages readable by authenticated"
  on public.messages for select
  to authenticated
  using (true);

create policy "Users can send messages"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- Session ratings / rematch intent
create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  would_play_again boolean,
  rating int check (rating between 1 and 5),
  want_rematch boolean default false,
  want_next_week boolean default false,
  created_at timestamptz default now(),
  unique (session_id, user_id)
);

alter table public.session_feedback enable row level security;

create policy "Feedback readable by authenticated"
  on public.session_feedback for select
  to authenticated
  using (true);

create policy "Users insert own feedback"
  on public.session_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Player'),
    coalesce(new.raw_user_meta_data->>'handle', 'u' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
