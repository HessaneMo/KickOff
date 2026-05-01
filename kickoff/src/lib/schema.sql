-- KickOff DB Schema

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  created_at timestamptz default now()
);

-- Tournaments
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organizer_id uuid references public.profiles(id) on delete cascade not null,
  format text not null check (format in ('groups', 'knockout', 'groups_knockout')),
  team_size int not null check (team_size between 5 and 11),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  status text not null default 'draft' check (status in ('draft', 'open', 'ongoing', 'finished')),
  short_code text unique not null,
  max_teams int not null default 8,
  starts_at timestamptz,
  created_at timestamptz default now()
);

-- Teams
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- Tournament members (roles)
create table public.tournament_members (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('organizer', 'co_organizer', 'encoder', 'player')),
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'starter' check (status in ('starter', 'sub')),
  position text,
  created_at timestamptz default now(),
  unique(tournament_id, user_id, role)
);

-- Groups (poules)
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  name text not null
);

-- Group teams
create table public.group_teams (
  group_id uuid references public.groups(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  primary key (group_id, team_id)
);

-- Matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  group_id uuid references public.groups(id) on delete set null,
  home_team_id uuid references public.teams(id) not null,
  away_team_id uuid references public.teams(id) not null,
  home_score int,
  away_score int,
  scheduled_at timestamptz,
  played_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'ongoing', 'finished')),
  encoded_by uuid references public.profiles(id) on delete set null
);

-- Goals (for player stats, Pro plan)
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade not null,
  player_id uuid references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) not null,
  is_assist boolean default false,
  minute int
);

-- RLS helper functions (SECURITY DEFINER bypasses RLS recursion)
create or replace function public.is_tournament_member(t_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.tournament_members
    where tournament_id = t_id and user_id = auth.uid()
  )
$$;

create or replace function public.is_tournament_organizer(t_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.tournament_members
    where tournament_id = t_id and user_id = auth.uid()
    and role in ('organizer', 'co_organizer')
  )
$$;

create or replace function public.is_tournament_encoder(t_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.tournament_members
    where tournament_id = t_id and user_id = auth.uid()
    and role in ('organizer', 'co_organizer', 'encoder')
  )
$$;

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.tournament_members enable row level security;
alter table public.groups enable row level security;
alter table public.group_teams enable row level security;
alter table public.matches enable row level security;
alter table public.goals enable row level security;

-- Profiles: user reads/updates own, all can read
create policy "profiles_read" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Tournaments
create policy "tournaments_read_public" on public.tournaments for select using (
  visibility = 'public' or organizer_id = auth.uid() or public.is_tournament_member(id)
);
create policy "tournaments_insert" on public.tournaments for insert with check (auth.uid() = organizer_id);
create policy "tournaments_update_organizer" on public.tournaments for update using (
  organizer_id = auth.uid() or public.is_tournament_organizer(id)
);

-- Teams
create policy "teams_read" on public.teams for select using (
  exists (select 1 from public.tournaments t where t.id = teams.tournament_id and (
    t.visibility = 'public' or t.organizer_id = auth.uid() or public.is_tournament_member(t.id)
  ))
);
create policy "teams_insert" on public.teams for insert with check (
  exists (select 1 from public.tournaments t where t.id = tournament_id and (
    t.organizer_id = auth.uid() or public.is_tournament_organizer(t.id)
  ))
);

-- Members (uses SECURITY DEFINER fns to avoid self-referential recursion)
create policy "members_read" on public.tournament_members for select using (
  exists (select 1 from public.tournaments t where t.id = tournament_id and (
    t.visibility = 'public' or t.organizer_id = auth.uid() or public.is_tournament_member(t.id)
  ))
);
create policy "members_insert_self" on public.tournament_members for insert with check (auth.uid() = user_id);
create policy "members_update_organizer" on public.tournament_members for update using (
  exists (select 1 from public.tournaments t where t.id = tournament_id and (
    t.organizer_id = auth.uid() or public.is_tournament_organizer(t.id)
  ))
);

-- Groups/Matches
create policy "groups_read" on public.groups for select using (
  exists (select 1 from public.tournaments t where t.id = tournament_id and (
    t.visibility = 'public' or t.organizer_id = auth.uid() or public.is_tournament_member(t.id)
  ))
);
create policy "group_teams_read" on public.group_teams for select using (true);
create policy "matches_read" on public.matches for select using (
  exists (select 1 from public.tournaments t where t.id = tournament_id and (
    t.visibility = 'public' or t.organizer_id = auth.uid() or public.is_tournament_member(t.id)
  ))
);
create policy "matches_update_encoder" on public.matches for update using (
  public.is_tournament_encoder(tournament_id)
);

create policy "goals_read" on public.goals for select using (true);
create policy "goals_insert_encoder" on public.goals for insert with check (
  exists (select 1 from public.matches m where m.id = match_id and public.is_tournament_encoder(m.tournament_id))
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Short code generator
create or replace function public.generate_short_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  done bool := false;
begin
  while not done loop
    code := '';
    for i in 1..4 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    code := code || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    done := not exists (select 1 from public.tournaments where short_code = code);
  end loop;
  return code;
end;
$$;
