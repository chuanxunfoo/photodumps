-- Atomic increments for aggregated public.user_stats (one row per user, PK user_id).
-- Apply in Supabase SQL Editor if you do not use CLI migrations.
-- Requires RLS policies: SELECT/INSERT/UPDATE for authenticated users on own user_id.

create or replace function public.increment_user_stats(
  p_photos_deleted integer,
  p_storage_mb_delta numeric
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_photos_deleted is null or p_photos_deleted <= 0 then
    return;
  end if;
  if p_storage_mb_delta is null or p_storage_mb_delta < 0 then
    return;
  end if;

  insert into public.user_stats (
    user_id,
    total_photos_deleted,
    total_photos_kept,
    total_storage_freed_mb,
    total_sessions,
    longest_streak_days,
    current_streak_days,
    last_session_at,
    updated_at
  )
  values (
    v_uid,
    p_photos_deleted,
    0,
    p_storage_mb_delta,
    0,
    0,
    0,
    now(),
    now()
  )
  on conflict (user_id) do update set
    total_photos_deleted = user_stats.total_photos_deleted + excluded.total_photos_deleted,
    total_storage_freed_mb = user_stats.total_storage_freed_mb + excluded.total_storage_freed_mb,
    last_session_at = now(),
    updated_at = now();
end;
$$;

grant execute on function public.increment_user_stats(integer, numeric) to authenticated;

-- If updates from the client fail, add:
-- create policy "user_stats_update_own" on public.user_stats for update to authenticated
--   using (user_id = auth.uid()) with check (user_id = auth.uid());
