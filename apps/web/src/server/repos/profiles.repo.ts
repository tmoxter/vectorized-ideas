import { SupabaseClient } from "@supabase/supabase-js";

export interface ProfileData {
  name: string;
  bio: string;
  achievements: string;
  experience: string;
  education: string;
  city_id?: number;
}

export interface VentureData {
  title: string;
  description: string;
}

export interface CofounderPreferenceData {
  title: string;
  description: string;
}

export interface CityData {
  name: string;
  country_name: string;
}

export interface UserDataRow {
  stage?: string;
  timezone?: string;
  availability_hours?: string;
}

export async function getProfile(sb: SupabaseClient, userId: string) {
  return sb
    .from("profiles")
    .select("name, bio, achievements, experience, education, city_id")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function getUserVenture(sb: SupabaseClient, userId: string) {
  return sb
    .from("user_ventures")
    .select("title, description")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function getLatestUserVenture(sb: SupabaseClient, userId: string) {
  return sb
    .from("user_ventures")
    .select("id, title, description, created_at, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getLatestUserVentureId(
  sb: SupabaseClient,
  userId: string
) {
  return sb
    .from("user_ventures")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getCofounderPreference(
  sb: SupabaseClient,
  userId: string
) {
  return sb
    .from("user_cofounder_preference")
    .select("title, description")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function getCity(sb: SupabaseClient, cityId: number) {
  return sb
    .from("cities")
    .select("name, country_name")
    .eq("id", cityId)
    .maybeSingle();
}

export async function searchCities(
  sb: SupabaseClient,
  query: string,
  countryIso2: string | null,
  limit: number
) {
  return sb.rpc("search_cities", {
    p_q: query,
    p_country_iso2: countryIso2,
    p_limit: limit,
  });
}

export async function getUserData(sb: SupabaseClient, userId: string) {
  return sb
    .from("user_data")
    .select("stage, timezone, availability_hours")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function deleteProfile(sb: SupabaseClient, userId: string) {
  return sb.from("profiles").delete().eq("user_id", userId);
}

export async function deleteUserVentures(sb: SupabaseClient, userId: string) {
  return sb.from("user_ventures").delete().eq("user_id", userId);
}

export async function deleteCofounderPreference(
  sb: SupabaseClient,
  userId: string
) {
  return sb.from("user_cofounder_preference").delete().eq("user_id", userId);
}

export async function deleteUserData(sb: SupabaseClient, userId: string) {
  return sb.from("user_data").delete().eq("user_id", userId);
}
