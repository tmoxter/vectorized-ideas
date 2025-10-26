create or replace function public.search_cities(
  p_q text,
  p_country_iso2 char(2) default null,
  p_limit int default 10
)
returns table (
  id bigint,
  name text,
  admin1 text,
  country_name text,
  country_iso2 char(2),
  lat double precision,
  lon double precision,
  population int,
  score real
) language sql stable as $$
  with params as (
    select unaccent(lower(trim(p_q))) as q
  )
  select
    c.id, c.name, c.admin1, c.country_name, c.country_iso2,
    c.lat, c.lon, c.population,
    greatest(
      word_similarity(c.name_norm, (select q from params)),
      similarity(      c.name_norm, (select q from params))
    ) as score
  from public.cities c
  where (
      c.name_norm like (select q from params) || '%'
      or similarity(c.name_norm, (select q from params)) > 0.2
    )
    and (p_country_iso2 is null or c.country_iso2 = p_country_iso2)
  order by score desc nulls last, c.population desc nulls last, c.name asc
  limit p_limit;
$$;

grant execute on function public.search_cities(text, char, int) to anon, authenticated;