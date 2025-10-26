create or replace function public.block_user(p_actor uuid, p_target uuid)
returns void language plpgsql as $$
begin
  insert into public.interactions (actor_user, target_user, action)
  select p_actor, p_target, 'block'
  where not exists (
    select 1 from public.interactions bi
    where bi.action = 'block'
      and least(bi.actor_user, bi.target_user)   = least(p_actor, p_target)
      and greatest(bi.actor_user, bi.target_user)= greatest(p_actor, p_target)
  );
end $$;
grant execute on function public.block_user(uuid,uuid) to authenticated;