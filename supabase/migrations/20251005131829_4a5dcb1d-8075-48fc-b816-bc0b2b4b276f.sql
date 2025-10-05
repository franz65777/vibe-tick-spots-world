-- City engagement aggregation for counts and followed users
create or replace function public.get_city_engagement(p_city text)
returns table(total_pins integer, followed_users jsonb)
security definer
set search_path = public
language plpgsql
as $$
declare
  normalized_city text := split_part(coalesce(p_city,''), ',', 1);
  followed jsonb := '[]'::jsonb;
begin
  -- Total unique pins across saved_places (Google) and user_saved_locations (internal)
  with sp as (
    select distinct place_id
    from saved_places
    where city ilike ('%' || normalized_city || '%')
  ),
  il as (
    select distinct l.id as location_id
    from locations l
    join user_saved_locations usl on usl.location_id = l.id
    where l.city ilike ('%' || normalized_city || '%')
  ),
  union_ids as (
    select place_id::text as uid from sp
    union all
    select location_id::text as uid from il
  )
  select count(*) into total_pins from union_ids;

  -- Followed users who have saves in this city (limit 3)
  with my_follows as (
    select following_id from follows where follower_id = auth.uid()
  ),
  users_from_sp as (
    select distinct s.user_id
    from saved_places s
    join my_follows f on f.following_id = s.user_id
    where s.city ilike ('%' || normalized_city || '%')
  ),
  users_from_usl as (
    select distinct usl.user_id
    from user_saved_locations usl
    join locations l on l.id = usl.location_id
    join my_follows f on f.following_id = usl.user_id
    where l.city ilike ('%' || normalized_city || '%')
  ),
  users_all as (
    select distinct user_id as id from (
      select user_id from users_from_sp
      union all
      select user_id from users_from_usl
    ) u
    limit 3
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'avatar_url', p.avatar_url)), '[]'::jsonb)
  into followed
  from users_all ua
  join profiles p on p.id = ua.id;

  followed_users := followed;
  return next;
end;
$$;

-- Allow authenticated users to execute
revoke all on function public.get_city_engagement(text) from public;
grant execute on function public.get_city_engagement(text) to authenticated;