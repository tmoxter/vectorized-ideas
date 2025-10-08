import { supabaseClient } from "./supabase";

export type EntityType = "idea" | "profile";

export async function embedAndUpsert(
  entityType: EntityType,
  entityId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the session token for authentication
    const supabase = supabaseClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return { success: false, error: "User not authenticated" };
    }

    // Call the server-side API route
    const response = await fetch("/api/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        entityType,
        entityId,
        text,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || "API request failed" };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Helper function to generate embeddings for profile data
export async function embedProfile(userId: string, profileText: string) {
  return embedAndUpsert("profile", userId, profileText);
}

// Helper function to generate embeddings for venture ideas
export async function embedIdea(ventureId: string, ideaText: string) {
  return embedAndUpsert("idea", ventureId, ideaText);
}

// Function to combine profile data into embeddings text
export function createProfileEmbeddingText(profile: {
  name?: string;
  bio?: string;
  achievements?: string;
  region?: string;
}): string {
  const parts = [
    profile.name && `Name: ${profile.name}`,
    profile.bio && `Bio: ${profile.bio}`,
    profile.achievements && `Experience: ${profile.achievements}`,
    profile.region && `Location: ${profile.region}`,
  ].filter(Boolean);

  return parts.join("\n\n");
}

// Function to combine venture data into embeddings text
export function createVentureEmbeddingText(venture: {
  title?: string;
  description?: string;
}): string {
  const parts = [
    venture.title && `Project: ${venture.title}`,
    venture.description && `Description: ${venture.description}`,
  ].filter(Boolean);

  return parts.join("\n\n");
}

// Function to combine co-founder preferences into embeddings text
export function createPreferencesEmbeddingText(preferences: {
  title?: string;
  description?: string;
}): string {
  const parts = [
    preferences.title && `Looking for: ${preferences.title}`,
    preferences.description && `Details: ${preferences.description}`,
  ].filter(Boolean);

  return parts.join("\n\n");
}
