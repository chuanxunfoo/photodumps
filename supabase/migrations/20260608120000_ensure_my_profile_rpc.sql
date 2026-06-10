-- Client-callable profile sync for Apple / Google sign-in (no separate signup step).
-- Runs as security definer so first login never fails due to RLS.

create or replace function public.ensure_my_profile(
  p_username text default null,
  p_email text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  row public.profiles;
  uname text;
  uemail text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  uemail := nullif(trim(coalesce(p_email, '')), '');
  uname := coalesce(
    nullif(trim(coalesce(p_username, '')), ''),
    nullif(split_part(coalesce(uemail, ''), '@', 1), ''),
    'user_' || left(uid::text, 8)
  );

  insert into public.profiles (id, email, username, plan_type, updated_at)
  values (uid, uemail, uname, 'hobby', now())
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    username = coalesce(public.profiles.username, excluded.username),
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

revoke all on function public.ensure_my_profile(text, text) from public;
grant execute on function public.ensure_my_profile(text, text) to authenticated;
