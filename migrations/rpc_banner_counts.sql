create or replace function public.banner_counts(
  p_user uuid,
  p_idea_id text default null,
  p_model text default null,
  p_version text default null
) returns table (
  loc_count bigint,
  sim_count bigint
) language sql stable as $$
  with
  viewer_info as (
    select
      p.user_id,
      p.city_id,
      us.region_scope,
      case coalesce(us.similarity_threshold, 0)
      -- hard-coded for now, will parameterize later
        when 1 then 0.62  -- Highly Similar
        when 2 then 0.55  -- Similar
        when 3 then 0.48  -- Broadly Similar
        when 4 then 0.38  -- Vaguely Similar
        else -1
      end as sim_floor
    from public.profiles p
    left join public.user_settings us on us.user_id = p.user_id
    where p.user_id = p_user
    limit 1
  ),
  v_city as (
    select
      vi.user_id,
      vi.city_id,
      vi.region_scope,
      vi.sim_floor,
      c.id              as v_city_id,
      c.country_iso2    as v_country,
      c.m49_subregion   as v_subregion
    from viewer_info vi
    left join public.cities c on c.id = vi.city_id
  ),
  -- candidates that pass the VIEWER -> CANDIDATE location filter
  cand_pool as (
    select
      pr.user_id as cand_user_id,
      pr.city_id as c_city_id,
      ci.country_iso2  as c_country,
      ci.m49_subregion as c_subregion
    from public.profiles pr
    left join public.cities ci on ci.id = pr.city_id
    cross join v_city vc
    where
      pr.is_published is true
      and pr.user_id <> vc.user_id
      -- location filter: only if viewer has scope + viewer city set
      and (
        vc.region_scope is null
        or vc.city_id is null
        or case vc.region_scope
             when 'city'      then pr.city_id     = vc.v_city_id
             when 'country'   then ci.country_iso2 = vc.v_country
             when 'subregion' then ci.m49_subregion = vc.v_subregion
             else true
           end
      )
      -- exclude blocked pairs
      and not exists (
        select 1
        from public.interactions bi
        where bi.action = 'blocked'
          and least(bi.actor_user,  bi.target_user)  = least(vc.user_id, pr.user_id)
          and greatest(bi.actor_user, bi.target_user) = greatest(vc.user_id, pr.user_id)
      )
  ),
  loc_count_cte as (
    select count(distinct cand_user_id)::bigint as loc_count from cand_pool
  ),
  q as (
    select emb.vector
    from public.embeddings emb
    where p_idea_id is not null
      and p_model   is not null
      and p_version is not null
      and emb.entity_type = 'idea'
      and emb.entity_id   = p_idea_id
      and emb.model       = p_model
      and emb.version     = p_version
    limit 1
  ),
  sim_users as (
    -- any candidate whose ANY idea meets the similarity floor (cosine)
    select distinct cp.cand_user_id
    from cand_pool cp
    join v_city vc on true
    join q on true
    join public.user_ventures uv on uv.user_id = cp.cand_user_id
    join public.embeddings e
      on e.entity_type = 'idea'
     and e.entity_id   = uv.id::text
     and e.model       = p_model
     and e.version     = p_version
    where
      -- cosine similarity (pgvector <#>) ∈ [-1,1]; compare directly to floor
      (vc.sim_floor is null or (e.vector <#> q.vector) >= vc.sim_floor)
  ),
  sim_count_cte as (
    select
      case when (select count(*) from q) = 0 then 0::bigint
           else (select count(*)::bigint from sim_users)
      end as sim_count
  )
  select
    (select loc_count from loc_count_cte) as loc_count,
    (select sim_count from sim_count_cte) as sim_count;
$$;

grant execute on function public.banner_counts(uuid,text,text,text) to authenticated;