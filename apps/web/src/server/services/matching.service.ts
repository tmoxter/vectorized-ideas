import { SupabaseClient } from "@supabase/supabase-js";
import * as profilesRepo from "../repos/profiles.repo";
import * as interactionsRepo from "../repos/interactions.repo";
import * as embeddingsRepo from "../repos/embeddings.repo";
import { EMBEDDING_MODEL, EMBEDDING_VERSION } from "../logic/similarity";

export interface EnrichedCandidate {
  id: string;
  stage?: string;
  timezone?: string;
  availability_hours?: string;
  similarity_score?: number;
  created_at?: string;
  profile: any;
  venture: any;
  preferences: any;
}

async function enrichCandidateData(
  sb: SupabaseClient,
  candidate: any
): Promise<EnrichedCandidate | null> {
  const userId = candidate.user_id;

  if (!userId) {
    console.warn("Candidate missing user_id:", candidate);
    return null;
  }

  try {
    const [profileResult, ventureResult, preferencesResult] = await Promise.all(
      [
        profilesRepo.getProfile(sb, userId),
        profilesRepo.getUserVenture(sb, userId),
        profilesRepo.getCofounderPreference(sb, userId),
      ]
    );

    let cityData = null;
    if (profileResult.data?.city_id) {
      const { data: city } = await profilesRepo.getCity(
        sb,
        profileResult.data.city_id
      );
      if (city) {
        cityData = { city_name: city.name, country: city.country_name };
      }
    }

    return {
      id: userId,
      stage: candidate.stage,
      timezone: candidate.timezone,
      availability_hours: candidate.availability_hours,
      similarity_score: candidate.idea_sim,
      created_at: candidate.created_at,
      profile: profileResult.data
        ? { ...profileResult.data, ...cityData }
        : null,
      venture: ventureResult.data,
      preferences: preferencesResult.data,
    };
  } catch (error) {
    console.error("Error enriching candidate data:", userId, error);
    return null;
  }
}

export async function findMatchingCandidates(
  sb: SupabaseClient,
  userId: string,
  limit: number
) {
  const { data: userVenture, error: ventureErr } =
    await profilesRepo.getLatestUserVenture(sb, userId);

  if (ventureErr || !userVenture) {
    throw new Error("No venture found for user");
  }

  const ideaId = userVenture.id;
  const { data: embedding, error: embErr } = await embeddingsRepo.getEmbedding(
    sb,
    "idea",
    ideaId.toString()
  );

  if (embErr || !embedding) {
    throw new Error(
      "No embedding found for this venture. Please make sure your profile is published to generate embeddings."
    );
  }

  console.log(
    "[matching] Successfully retrieved latest venture and embedding for user:",
    userId,
    "Calling KNN query in DB"
  );

  const { data: cands, error: kErr } = await embeddingsRepo.findKnnCandidates(
    sb,
    embedding.entity_id,
    EMBEDDING_MODEL,
    EMBEDDING_VERSION,
    100,
    10
  );

  if (kErr) {
    console.error("KNN function error:", kErr);
    throw new Error(kErr.message);
  }

  console.log(
    "[matching] Retrieved",
    Array.isArray(cands) ? cands.length : 0,
    "candidates from KNN query"
  );

  const limitedCands = Array.isArray(cands) ? cands.slice(0, limit) : [];
  const enrichedCandidates = await Promise.all(
    limitedCands.map((candidate) => enrichCandidateData(sb, candidate))
  );

  const validCandidates = enrichedCandidates.filter((c) => c !== null);

  return {
    items: validCandidates,
    baseVenture: userVenture,
  };
}

export async function getBannerCounts(sb: SupabaseClient, userId: string) {
  const { data: venture, error: ventureError } =
    await profilesRepo.getLatestUserVenture(sb, userId);

  if (ventureError) {
    console.error("Error fetching user venture:", ventureError);
    throw new Error("Error fetching user venture");
  }

  console.log("[banner-counts] Retrieved latest venture for active user");

  // If user doesn't have a venture yet, return default counts
  // TODO: We can still compute total_profiles based on location even without a venture
  if (!venture) {
    console.log("[banner-counts] No venture found, returning default counts");
    return {
      total_profiles: 0,
      related_topics: 0,
    };
  }

  // Get the embedding version for the active embedding of this venture to only compute
  // similarities based on the same model/version
  const { data: embedding } = await embeddingsRepo.getEmbeddingVersion(
    sb,
    "idea",
    venture.id
  );
  // Default to "0" if no embedding found, will not lead to any matches
  const version = embedding?.version || "0";
  console.log(
    "[banner-counts] Calling banner_counts RPC with embedding params:",
    {
      p_model: EMBEDDING_MODEL,
      p_version: version,
    }
  );

  const { data, error } = await embeddingsRepo.getBannerCounts(
    sb,
    userId,
    venture.id,
    EMBEDDING_MODEL,
    version
  );

  if (error) {
    console.error("[banner-counts] Error calling banner_counts RPC:", error);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    console.log("[banner-counts] RPC returned no data, returning 0 counts");
    return {
      total_profiles: 0,
      related_topics: 0,
    };
  }

  const result = {
    total_profiles: data[0].loc_count || 0,
    related_topics: data[0].sim_count || 0,
  };
  console.log("[banner-counts] Returning mapped result:", result);
  return result;
}

export async function getPendingRequests(
  sb: SupabaseClient,
  userId: string,
  limit: number,
  offset: number
) {
  console.log(
    `[pending-requests] Fetching pending requests for user ID: ${userId}, limit: ${limit}, offset: ${offset}`
  );

  const { data, error } = await interactionsRepo.getPendingRequests(
    sb,
    userId,
    limit,
    offset
  );

  if (error) {
    console.error("Error fetching pending requests:", error);
    throw new Error(error.message);
  }

  const enrichedData = await Promise.all(
    (data || []).map((item: any) => enrichCandidateData(sb, item))
  );

  const validData = enrichedData.filter((item) => item !== null);

  return { items: validData };
}
