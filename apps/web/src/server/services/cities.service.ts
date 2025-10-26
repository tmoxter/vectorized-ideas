import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import * as profilesRepo from "../repos/profiles.repo";

export async function searchCities(
  sb: SupabaseClient,
  query: string,
  country: string | null,
  limit: number
) {
  const { data, error } = await profilesRepo.searchCities(
    sb,
    query,
    country,
    limit
  );

  if (error) {
    throw new Error(error.message);
  }

  return {
    items: (data ?? []).map((d: any) => ({
      id: d.id,
      label: `${d.name}${d.admin1 ? `, ${d.admin1}` : ""} (${d.country_name})`,
      name: d.name,
      admin1: d.admin1,
      country: d.country_name,
      iso2: d.country_iso2,
      lat: d.lat,
      lon: d.lon,
      population: d.population,
    })),
  };
}
