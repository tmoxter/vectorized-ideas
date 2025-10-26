create or replace function public.knn_candidates_interact_prefs_applied(
  p_idea_id text,
  p_model text,
  p_version text,
  p_limit int default 200,
  p_probes int default 20,
  p_pass_cooldown_days int default 60
) returns table (
  entity_id text,
  user_id uuid,
  title text,
  description text,
  idea_sim double precision
) language plpgsql as $$
begin
  perform set_config('ivfflat.probes', p_probes::text, true);

  return query
  with
  viewer as (
    select uv.user_id
    from public.user_ventures uv
    where uv.id::text = p_idea_id
    limit 1
  ),
  -- viewer profile + settings (similarity threshold + region scope)
  viewer_info as (
    select
      v.user_id,
      p.city_id,
      us.region_scope,
      case coalesce(us.similarity_threshold, 0)
      -- cosine similarity levels currently hard-coded here -> FIXME
        when 1 then 0.62
        when 2 then 0.55
        when 3 then 0.48
        when 4 then 0.38
        else null
      end as sim_floor
    from viewer v
    left join public.profiles p on p.user_id = v.user_id
    left join public.user_settings us on us.user_id = v.user_id
  ),
  v_city as (
    select
      vi.user_id,
      vi.region_scope,
      vi.city_id,
      vi.sim_floor,
      vc.id            as v_city_id,
      vc.country_iso2  as v_country,
      vc.m49_subregion as v_subregion
    from viewer_info vi
    left join public.cities vc on vc.id = vi.city_id
  ),
  q as (
    select emb.vector
    from public.embeddings emb
    where emb.entity_type = 'idea'
      and emb.entity_id  = p_idea_id
      and emb.model      = p_model
      and emb.version    = p_version
    limit 1
  ),
  base as (
    select
      e.entity_id,
      uv.user_id,
      uv.title,
      uv.description,
      (e.vector <#> q.vector)     as cosine_similarity,
      100*((e.vector <#> q.vector) + 1)/2 as idea_sim
    from public.embeddings e
    cross join q
    join public.user_ventures uv on uv.id::text = e.entity_id
    where e.entity_type = 'idea'
      and e.entity_id <> p_idea_id
      and e.model   = p_model
      and e.version = p_version
    order by e.vector <#> q.vector
    limit p_limit * 4
  ),
  cand_city as (
    select
      b.*,
      cprof.city_id            as c_city_id,
      cc.country_iso2          as c_country,
      cc.m49_subregion         as c_subregion,
      us.region_scope          as cand_region_scope
    from base b
    join public.profiles cprof on cprof.user_id = b.user_id
    left join public.cities   cc  on cc.id  = cprof.city_id
    left join public.user_settings us on us.user_id = b.user_id
  )
  select cc.entity_id, cc.user_id, cc.title, cc.description, cc.idea_sim
  from cand_city cc
  join v_city vc on true
  join viewer v on true
  where
    cc.user_id <> v.user_id

    -- SIMILARITY FLOOR
    and (vc.sim_floor is null or cc.cosine_similarity >= vc.sim_floor)

    -- VIEWER → CANDIDATE region filter (only if viewer has scope + viewer city known)
    and (
      vc.region_scope is null
      or vc.city_id is null
      or case vc.region_scope
           when 'city'      then cc.c_city_id   = vc.v_city_id
           when 'country'   then cc.c_country   = vc.v_country
           when 'subregion' then cc.c_subregion = vc.v_subregion
           else true
         end
    )

    -- CANDIDATE → VIEWER mutual region filter (only if candidate has scope + candidate city known)
    and (
      cc.cand_region_scope is null
      or cc.c_city_id is null
      or case cc.cand_region_scope
           when 'city'      then vc.v_city_id   = cc.c_city_id
           when 'country'   then vc.v_country   = cc.c_country
           when 'subregion' then vc.v_subregion = cc.c_subregion
           else true -- worldwide
         end
    )

    -- EXCLUSIONS
    and not exists (
      select 1
      from public.interactions bi
      where bi.action = 'blocked'
        and least(bi.actor_user, bi.target_user)   = least(v.user_id, cc.user_id)
        and greatest(bi.actor_user, bi.target_user)= greatest(v.user_id, cc.user_id)
    )
    and not exists (
      select 1
      from public.interactions li
      where li.actor_user  = v.user_id
        and li.target_user = cc.user_id
        and li.action = 'like'
    )
    and not exists (
      select 1
      from public.interactions pi
      where pi.actor_user  = v.user_id
        and pi.target_user = cc.user_id
        and pi.action = 'pass'
        and pi.created_at > now() - (p_pass_cooldown_days || ' days')::interval
    )
  order by cc.cosine_similarity
  limit p_limit;
end $$;

grant execute on function public.knn_candidates_interact_prefs_applied(text,text,text,int,int,int) to authenticated;