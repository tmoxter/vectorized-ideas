create or replace function public.pending_requests(
  p_user uuid,
  p_limit int default 50,
  p_offset int default 0
) returns table (
  user_id uuid,
  liked_at timestamptz,
  name text,
  city_id bigint
) language sql stable as $$
  with incoming as (
    select actor_user as liker_user, max(created_at) as liked_at
    from public.interactions
    where target_user = p_user
      and action = 'like'
    group by actor_user
  ),
  my_like as (
    select target_user as liked_user
    from public.interactions
    where actor_user = p_user
      and action = 'like'
  ),
  blocked_pairs as (
    select
      least(actor_user, target_user)  as u_min,
      greatest(actor_user, target_user) as u_max
    from public.interactions
    where action = 'blocked'
  ),
  active_matches as (
    select
      least(user_a, user_b) as u_min,
      greatest(user_a, user_b) as u_max
    from public.matches
    where active
  )
  select
    i.liker_user as user_id,
    i.liked_at,
    pr.name,
    pr.city_id
  from incoming i
  join public.profiles pr on pr.user_id = i.liker_user
  left join my_like ml
    on ml.liked_user = i.liker_user
  left join blocked_pairs bp
    on bp.u_min = least(p_user, i.liker_user)
   and bp.u_max = greatest(p_user, i.liker_user)
  left join active_matches m
    on m.u_min = least(p_user, i.liker_user)
   and m.u_max = greatest(p_user, i.liker_user)
  where
    ml.liked_user is null
    and bp.u_min is null
    and m.u_min  is null
  order by i.liked_at desc
  limit p_limit offset p_offset
$$;

grant execute on function public.pending_requests(uuid,int,int) to authenticated;