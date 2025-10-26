import { SupabaseClient } from "@supabase/supabase-js";

export type InteractionAction = "like" | "pass" | "block" | "unblock";

export interface InteractionInsert {
  actor_user: string;
  target_user: string;
  action: InteractionAction;
  actor_current_idea: string | null;
  target_current_idea: string | null;
}

export interface MatchInsert {
  user_a: string;
  user_b: string;
  active: boolean;
}

export async function insertInteraction(
  sb: SupabaseClient,
  interaction: InteractionInsert
) {
  return sb.from("interactions").insert(interaction).select();
}

export async function upsertPassInteraction(
  sb: SupabaseClient,
  interaction: InteractionInsert & { created_at: string }
) {
  return sb.from("interactions").upsert(interaction).select();
}

export async function checkReciprocalLike(
  sb: SupabaseClient,
  actorUserId: string,
  targetUserId: string
) {
  return sb
    .from("interactions")
    .select("id")
    .eq("actor_user", targetUserId)
    .eq("target_user", actorUserId)
    .eq("action", "like")
    .limit(1);
}

export async function createMatch(sb: SupabaseClient, match: MatchInsert) {
  return sb.from("matches").insert(match).select();
}

export async function blockUser(
  sb: SupabaseClient,
  actorUserId: string,
  targetUserId: string
) {
  return sb.rpc("block_user", {
    p_actor: actorUserId,
    p_target: targetUserId,
  });
}

export async function deleteBlockInteraction(
  sb: SupabaseClient,
  actorUserId: string,
  targetUserId: string
) {
  return sb
    .from("interactions")
    .delete()
    .eq("actor_user", actorUserId)
    .eq("target_user", targetUserId)
    .eq("action", "block");
}

export async function deleteUserInteractions(
  sb: SupabaseClient,
  userId: string
) {
  await sb.from("interactions").delete().eq("actor_user", userId);
  await sb.from("interactions").delete().eq("target_user", userId);
}

export async function deleteUserMatches(sb: SupabaseClient, userId: string) {
  await sb.from("matches").delete().eq("user_a", userId);
  await sb.from("matches").delete().eq("user_b", userId);
}

export async function getPendingRequests(
  sb: SupabaseClient,
  userId: string,
  limit: number,
  offset: number
) {
  return sb.rpc("pending_requests", {
    p_user: userId,
    p_limit: limit,
    p_offset: offset,
  });
}
