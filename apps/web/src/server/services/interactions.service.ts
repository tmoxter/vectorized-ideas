import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import * as interactionsRepo from "../repos/interactions.repo";
import * as profilesRepo from "../repos/profiles.repo";
import { InteractionAction } from "../repos/interactions.repo";

export async function recordInteraction(
  sb: SupabaseClient,
  actorUserId: string,
  targetUserId: string,
  action: InteractionAction
) {
  const [actorVenture, targetVenture] = await Promise.all([
    profilesRepo.getLatestUserVentureId(sb, actorUserId),
    profilesRepo.getLatestUserVentureId(sb, targetUserId),
  ]);

  const actorCurrentIdea = actorVenture.data?.id || null;
  const targetCurrentIdea = targetVenture.data?.id || null;

  if (action === "like") {
    const { error: insertError } = await interactionsRepo.insertInteraction(
      sb,
      {
        actor_user: actorUserId,
        target_user: targetUserId,
        action: "like",
        actor_current_idea: actorCurrentIdea,
        target_current_idea: targetCurrentIdea,
      }
    );

    if (insertError && !insertError.message.includes("duplicate")) {
      console.error(
        "[interactions] Error inserting like interaction:",
        insertError
      );
      throw new Error(`Database error: ${insertError.message}`);
    }

    const { data: reciprocal } = await interactionsRepo.checkReciprocalLike(
      sb,
      actorUserId,
      targetUserId
    );

    if (reciprocal && reciprocal.length > 0) {
      const { error: matchError } = await interactionsRepo.createMatch(sb, {
        user_a: actorUserId,
        user_b: targetUserId,
        active: true,
      });
      console.log("Match creation result:", matchError);

      if (matchError && !matchError.message.includes("duplicate")) {
        console.error("[interactions] Error creating match:", matchError);
      }
    }
  } else if (action === "pass") {
    const { error: upsertError } = await interactionsRepo.upsertPassInteraction(
      sb,
      {
        actor_user: actorUserId,
        target_user: targetUserId,
        action: "pass",
        actor_current_idea: actorCurrentIdea,
        target_current_idea: targetCurrentIdea,
        created_at: new Date().toISOString(),
      }
    );

    if (upsertError) {
      console.error("Error inserting pass interaction:", upsertError);
      throw new Error(`Database error: ${upsertError.message}`);
    }
  } else if (action === "block") {
    const { error } = await interactionsRepo.blockUser(
      sb,
      actorUserId,
      targetUserId
    );

    if (error) {
      console.error("Error blocking user:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  } else if (action === "unblock") {
    // For now, delete the block interaction, we may want to introduce an unblock interaction and archive all
    const { error: deleteError } =
      await interactionsRepo.deleteBlockInteraction(
        sb,
        actorUserId,
        targetUserId
      );

    if (deleteError) {
      console.error("Error unblocking user:", deleteError);
      throw new Error(`Database error: ${deleteError.message}`);
    }
  }
}
