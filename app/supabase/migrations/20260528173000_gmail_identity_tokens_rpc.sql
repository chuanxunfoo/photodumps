-- Allow secure Gmail token lookup without direct auth schema REST access.

create or replace function public.get_google_identity_tokens(p_user_id uuid default auth.uid())
returns table (
  provider_token text,
  provider_refresh_token text
)
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    i.provider_token,
    i.provider_refresh_token
  from auth.identities i
  where i.user_id = p_user_id
    and i.provider = 'google'
  order by i.last_sign_in_at desc nulls last
  limit 1;
$$;

revoke all on function public.get_google_identity_tokens(uuid) from public;
grant execute on function public.get_google_identity_tokens(uuid) to authenticated;
grant execute on function public.get_google_identity_tokens(uuid) to service_role;
