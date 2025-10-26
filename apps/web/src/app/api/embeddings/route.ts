import { NextRequest, NextResponse } from "next/server";
// Switch to small HF model maybe? Might need to serve it elsewhere considering vercel is serverless
// and we will need to cold start and load the model on every request
import OpenAI from "openai";
import { supabaseClient } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export type EntityType = "idea" | "profile";

interface EmbedRequest {
  entityType: EntityType;
  entityId: string;
  text: string;
}
// tied, regenerate all embeddings and incrementing version if changing model
const MODEL = "text-embedding-3-small";
const VERSION = "v1";

export async function POST(request: NextRequest) {
  try {
    const { entityType, entityId, text }: EmbedRequest = await request.json();

    if (!entityType || !entityId || !text) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const supabase = supabaseClient();
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "No authorization header" },
        { status: 401 }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Generate embeddings
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const response = await client.embeddings.create({
      model: MODEL,
      input: text,
    });
    if (!response.data || response.data.length === 0) {
      return NextResponse.json(
        { success: false, error: "No embedding received" },
        { status: 500 }
      );
    }
    let embedding = response.data[0].embedding;
    // Normalize embedding
    const norm = Math.hypot(...embedding);
    if (norm > 0) embedding = embedding.map((x) => x / norm);
    console.log("[embeddings] Generated embedding for", entityType, entityId);

    const { error: upsertError } = await supabase.from("embeddings").upsert({
      entity_type: entityType,
      entity_id: entityId,
      user_id: user.id,
      model: MODEL,
      vector: embedding,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      return NextResponse.json(
        { success: false, error: `Database error: ${upsertError.message}` },
        { status: 500 }
      );
    }
    console.log(
      `[embeddings] Upserted embedding for ${entityType} ID: ${entityId}`
    );
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error in embedding API:", error);

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { success: false, error: `OpenAI API error: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const limit = Number(url.searchParams.get("limit") ?? "20");

    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the user's most recent venture from user_ventures table
    const { data: userVenture, error: ventureErr } = await sb
      .from("user_ventures")
      .select("id, title, description, created_at, user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (ventureErr || !userVenture) {
      return NextResponse.json(
        { error: "No venture found for user" },
        { status: 404 }
      );
    }
    const ideaId = userVenture.id;
    const { data: embedding, error: embErr } = await sb
      .from("embeddings")
      .select("entity_id, entity_type")
      .eq("entity_type", "idea")
      .eq("entity_id", ideaId.toString())
      .single();

    if (embErr || !embedding) {
      return NextResponse.json(
        {
          error:
            "No embedding found for this venture. Please make sure your profile is published to generate embeddings.",
          details: embErr?.message,
        },
        { status: 404 }
      );
    }

    console.log(
      "[embeddings] Sucessfully retrieved latest venture and embedding for user:",
      userId,
      " Calling KNN query in DB"
    );
    const { data: cands, error: kErr } = await sb.rpc(
      "knn_candidates_interact_prefs_applied",
      {
        p_idea_id: embedding.entity_id,
        p_model: MODEL,
        p_version: VERSION,
        // For now just overfetch a bit and limit after enrichment
        p_limit: 100,
        p_probes: 10,
      }
    );
    if (kErr) {
      console.error("KNN function error:", kErr);
      return NextResponse.json({ error: kErr.message }, { status: 500 });
    }
    console.log(
      "[embeddings] Retrieved",
      Array.isArray(cands) ? cands.length : 0,
      "candidates from KNN query"
    );

    // Enrich candidate data with profile, venture, and preferences
    const limitedCands = Array.isArray(cands) ? cands.slice(0, limit) : [];
    const enrichedCandidates = await Promise.all(
      limitedCands.map(async (candidate: any) => {
        const candidateUserId = candidate.user_id;

        if (!candidateUserId) {
          console.warn("Candidate missing user_id:", candidate);
          return null;
        }

        try {
          const [profileResult, ventureResult, preferencesResult] =
            await Promise.all([
              sb
                .from("profiles")
                .select(
                  "name, bio, achievements, experience, education, city_id"
                )
                .eq("user_id", candidateUserId)
                .maybeSingle(),
              sb
                .from("user_ventures")
                .select("title, description")
                .eq("user_id", candidateUserId)
                .maybeSingle(),
              sb
                .from("user_cofounder_preference")
                .select("title, description")
                .eq("user_id", candidateUserId)
                .maybeSingle(),
            ]);

          // Fetch city data if city_id exists
          let cityData = null;
          if (profileResult.data?.city_id) {
            const { data: city, error: cityError } = await sb
              .from("cities")
              .select("name, country_name")
              .eq("id", profileResult.data.city_id)
              .maybeSingle();

            if (city) {
              cityData = { city_name: city.name, country: city.country_name };
            }
          }

          return {
            id: candidateUserId,
            stage: candidate.stage,
            timezone: candidate.timezone,
            availability_hours: candidate.availability_hours,
            similarity_score: candidate.idea_sim,
            profile: profileResult.data
              ? {
                  ...profileResult.data,
                  ...cityData,
                }
              : null,
            venture: ventureResult.data,
            preferences: preferencesResult.data,
          };
        } catch (error) {
          console.error(
            "[embeddings] Error enriching candidate data:",
            candidateUserId,
            error
          );
          return null;
        }
      })
    );

    // Filter out null candidates (failed to load)
    const validCandidates = enrichedCandidates.filter((c) => c !== null);
    const response = {
      items: validCandidates,
      baseVenture: userVenture,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/embeddings error:", error);
    return NextResponse.json(
      {
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
