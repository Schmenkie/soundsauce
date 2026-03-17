-- ============================================
-- Phase 3D: Update handle_new_user trigger for Google OAuth
-- ============================================
-- Google OAuth provides user metadata with 'name' and 'picture' fields
-- instead of 'username' and 'avatar_url'. This update uses COALESCE
-- to fallback through multiple metadata fields, ensuring all auth
-- providers populate the profile correctly.
--
-- Priority for username: username → full_name → name → email prefix
-- Priority for avatar:   avatar_url → picture
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
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
    )
  );
  return new;
end;
$$ language plpgsql security definer;

-- Also backfill any existing profiles that have NULL usernames
-- (from previous Google OAuth signups or blank email signups)
update public.profiles p
set username = coalesce(
  (select raw_user_meta_data->>'full_name' from auth.users u where u.id = p.id),
  (select raw_user_meta_data->>'name' from auth.users u where u.id = p.id),
  (select split_part(email, '@', 1) from auth.users u where u.id = p.id)
)
where p.username is null;

-- Backfill avatar_url from Google's 'picture' field for users who have it
update public.profiles p
set avatar_url = (select raw_user_meta_data->>'picture' from auth.users u where u.id = p.id)
where p.avatar_url is null
  and exists (
    select 1 from auth.users u
    where u.id = p.id
      and u.raw_user_meta_data->>'picture' is not null
  );
