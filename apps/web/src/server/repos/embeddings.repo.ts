import { SupabaseClient } from "@supabase/supabase-js";

export type EntityType = "idea" | "profile";

export interface EmbeddingInsert {
  entity_type: EntityType;
  entity_id: string;
  user_id: string;
  model: string;
  vector: number[];
  updated_at: string;
}

export async function upsertEmbedding(
  sb: SupabaseClient,
  embedding: EmbeddingInsert
) {
  return sb.from("embeddings").upsert(embedding);
}

export async function getEmbedding(
  sb: SupabaseClient,
  entityType: EntityType,
  entityId: string
) {
  return sb
    .from("embeddings")
    .select("entity_id, entity_type")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();
}

export async function getEmbeddingVersion(
  sb: SupabaseClient,
  entityType: EntityType,
  entityId: string
) {
  return sb
    .from("embeddings")
    .select("version")
    .eq("entity_id", entityId)
    .eq("entity_type", entityType)
    .maybeSingle();
}

export async function findKnnCandidates(
  sb: SupabaseClient,
  ideaId: string,
  model: string,
  version: string,
  limit: number,
  probes: number
) {
  return sb.rpc("knn_candidates_interact_prefs_applied", {
    p_idea_id: ideaId,
    p_model: model,
    p_version: version,
    p_limit: limit,
    p_probes: probes,
  });
}

export async function getBannerCounts(
  sb: SupabaseClient,
  userId: string,
  ideaId: string,
  model: string,
  version: string
) {
  return sb.rpc("banner_counts", {
    p_user: userId,
    p_idea_id: ideaId,
    p_model: model,
    p_version: version,
  });
}

export async function deleteProfileEmbeddings(
  sb: SupabaseClient,
  userId: string
) {
  return sb.from("profile_embeddings").delete().eq("user_id", userId);
}

export async function deleteVentureEmbeddings(
  sb: SupabaseClient,
  userId: string
) {
  return sb.from("venture_embeddings").delete().eq("user_id", userId);
}
