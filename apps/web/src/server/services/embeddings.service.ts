import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as embeddingsRepo from "../repos/embeddings.repo";
import { EntityType } from "../repos/embeddings.repo";
import { normalizeVector, EMBEDDING_MODEL } from "../logic/similarity";

export async function generateAndStoreEmbedding(
  sb: SupabaseClient,
  userId: string,
  entityType: EntityType,
  entityId: string,
  text: string,
  openaiApiKey: string
) {
  const client = new OpenAI({ apiKey: openaiApiKey });

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  if (!response.data || response.data.length === 0) {
    throw new Error("No embedding received");
  }

  const embedding = normalizeVector(response.data[0].embedding);
  console.log("[embeddings] Generated embedding for", entityType, entityId);

  const { error: upsertError } = await embeddingsRepo.upsertEmbedding(sb, {
    entity_type: entityType,
    entity_id: entityId,
    user_id: userId,
    model: EMBEDDING_MODEL,
    vector: embedding,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    throw new Error(`Database error: ${upsertError.message}`);
  }

  console.log(
    `[embeddings] Upserted embedding for ${entityType} ID: ${entityId}`
  );
}
