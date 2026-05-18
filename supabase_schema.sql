-- LEGION — Supabase Database Schema
-- Safe to re-run: drops old policies first, renames old tables if needed.

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Clean up old policies (so this script can be re-run)
-- ═══════════════════════════════════════════════════════════════

-- Drop old policies on the "operatives" table (from prior scaffold)
do $$ begin
  drop policy if exists "operatives: own record" on operatives;
exception when undefined_table then null;
end $$;

-- Rename old "operatives" table → "operators" if it exists
do $$ begin
  if exists (select 1 from information_schema.tables where table_name = 'operatives' and table_schema = 'public') then
    alter table operatives rename to operators;
    -- Also rename old index
    alter index if exists idx_operatives_user_id rename to idx_operators_user_id;
  end if;
end $$;

-- Drop existing policies on all tables (safe if they don't exist)
drop policy if exists "operators: own record" on operators;
drop policy if exists "cells: members can read" on cells;
drop policy if exists "cells: authenticated can create" on cells;
drop policy if exists "cell_members: visible to members" on cell_members;
drop policy if exists "cell_members: self insert" on cell_members;
drop policy if exists "matches: authenticated read" on matches;

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Create tables (IF NOT EXISTS keeps them safe on re-run)
-- ═══════════════════════════════════════════════════════════════

-- Operators: one row per user, stores their Riot ID + PUUID
create table if not exists operators (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade unique not null,
  puuid       text unique,
  riot_game_name text,
  riot_tag_line  text,
  is_verified boolean default false,
  created_at  timestamptz default now()
);

-- Cells: named friend groups
create table if not exists cells (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- Backfill: add invite_code column if table already exists without it
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'cells' and column_name = 'invite_code'
  ) then
    alter table cells add column invite_code text unique;
  end if;
end $$;

-- Cell membership: many-to-many between users and cells
create table if not exists cell_members (
  id       uuid primary key default gen_random_uuid(),
  cell_id  uuid references cells(id) on delete cascade not null,
  user_id  uuid references auth.users(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(cell_id, user_id)
);

-- Match cache: stores raw Riot API match data to avoid re-fetching
create table if not exists matches (
  match_id             text primary key,
  match_data           jsonb not null,
  participants_puuids  text[] not null default '{}',
  fetched_at           timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Create indexes
-- ═══════════════════════════════════════════════════════════════

create index if not exists idx_cell_members_cell_id on cell_members(cell_id);
create index if not exists idx_cell_members_user_id on cell_members(user_id);
create index if not exists idx_operators_user_id on operators(user_id);
create index if not exists idx_matches_participants on matches using gin(participants_puuids);

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Enable Row Level Security
-- ═══════════════════════════════════════════════════════════════

alter table operators enable row level security;
alter table cells enable row level security;
alter table cell_members enable row level security;
alter table matches enable row level security;

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: Create policies (dropped in Step 1, so always fresh)
-- ═══════════════════════════════════════════════════════════════

-- Operators: users can read/write their own record
create policy "operators: own record" on operators
  for all using (auth.uid() = user_id);

-- Cells: members can read cells they belong to
create policy "cells: members can read" on cells
  for select using (
    exists (select 1 from cell_members where cell_id = cells.id and user_id = auth.uid())
  );

-- Cells: any authenticated user can create a cell
create policy "cells: authenticated can create" on cells
  for insert with check (auth.uid() is not null);

-- Cell members: visible to other members of the same cell
create policy "cell_members: visible to members" on cell_members
  for select using (
    user_id = auth.uid() or
    exists (select 1 from cell_members cm where cm.cell_id = cell_members.cell_id and cm.user_id = auth.uid())
  );

-- Cell members: users can add themselves
create policy "cell_members: self insert" on cell_members
  for insert with check (auth.uid() = user_id);

-- Matches: any authenticated user can read (game data is public)
create policy "matches: authenticated read" on matches
  for select using (auth.uid() is not null);

-- Service role bypasses RLS for server-side writes
-- (no additional policy needed; service role key bypasses RLS automatically)
