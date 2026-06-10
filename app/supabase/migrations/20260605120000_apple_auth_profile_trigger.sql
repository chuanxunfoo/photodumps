-- Auto-create a hobby profile when any auth user is created (Apple / Google / email).
-- Runs as security definer so RLS never blocks first sign-in.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  uemail text;
begin
  uemail := nullif(trim(coalesce(new.email, '')), '');
  uname := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(split_part(coalesce(uemail, ''), '@', 1), ''),
    'user_' || left(new.id::text, 8)
  );

  insert into public.profiles (id, email, username, plan_type, updated_at)
  values (new.id, uemail, uname, 'hobby', now())
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    username = coalesce(public.profiles.username, excluded.username),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any auth users missing a profile row.
insert into public.profiles (id, email, username, plan_type, updated_at)
select
  u.id,
  nullif(trim(coalesce(u.email, '')), ''),
  coalesce(
    nullif(trim(coalesce(u.raw_user_meta_data->>'username', '')), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'user_' || left(u.id::text, 8)
  ),
  'hobby',
  now()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
