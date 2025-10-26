import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import * as profilesRepo from "../repos/profiles.repo";
import * as interactionsRepo from "../repos/interactions.repo";
import * as embeddingsRepo from "../repos/embeddings.repo";

export async function deleteAccount(sb: SupabaseClient, userId: string) {
  // No soft delete for now, wipe it all #TODO
  // First authenticate user then use service role for deletion
  await embeddingsRepo.deleteProfileEmbeddings(sb, userId);
  await embeddingsRepo.deleteVentureEmbeddings(sb, userId);
  // TODO: Especially in case of "block" interactions, we would want to archive and map to user login credentials
  await interactionsRepo.deleteUserInteractions(sb, userId);
  await interactionsRepo.deleteUserMatches(sb, userId);
  await profilesRepo.deleteCofounderPreference(sb, userId);
  await profilesRepo.deleteUserVentures(sb, userId);
  await profilesRepo.deleteUserData(sb, userId);
  await profilesRepo.deleteProfile(sb, userId);

  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`Error deleting user from auth: ${error.message}`);
  }
}
