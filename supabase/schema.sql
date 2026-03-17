-- ============================================
-- SoundRecipe Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================

-- ============================================
-- 1. Profiles table
-- Auto-created when a user signs up via trigger
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced', 'professional')),
  daw_preference text,
  anthem_url text,
  anthem_title text,
  anthem_artist text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Anyone can view public profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Users can insert their own profile
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================
-- 2. Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 3. Analyses table
-- Stores audio analysis results
-- ============================================
create table public.analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  audio_filename text,
  audio_url text,
  instrument text,
  stem_type text,
  results jsonb not null default '{}'::jsonb,
  is_public boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.analyses enable row level security;

-- Users can view their own analyses
create policy "Users can view own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

-- Anyone can view public analyses
create policy "Public analyses are viewable by everyone"
  on public.analyses for select
  using (is_public = true);

-- Users can insert their own analyses
create policy "Users can insert own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

-- Users can update their own analyses
create policy "Users can update own analyses"
  on public.analyses for update
  using (auth.uid() = user_id);

-- Users can delete their own analyses
create policy "Users can delete own analyses"
  on public.analyses for delete
  using (auth.uid() = user_id);

-- ============================================
-- 4. Indexes for performance
-- ============================================
create index analyses_user_id_idx on public.analyses(user_id);
create index analyses_created_at_idx on public.analyses(created_at desc);
create index analyses_is_public_idx on public.analyses(is_public) where is_public = true;
create index profiles_username_idx on public.profiles(username);

-- ============================================
-- 5. Updated_at auto-update trigger
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger analyses_updated_at
  before update on public.analyses
  for each row execute procedure public.handle_updated_at();
