-- ============================================
-- Phase 5D: Display Name
-- Adds display_name column to profiles so users
-- can have a display name separate from their @username handle.
-- ============================================

-- 1. Add display_name column (nullable, no constraints)
alter table public.profiles add column if not exists display_name text;

-- 2. Update handle_new_user trigger to populate display_name from OAuth metadata
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
