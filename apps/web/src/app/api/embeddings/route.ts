import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseClient } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
//import { rescoreBlend } from "@/server/matching";

export type EntityType = "idea" | "profile";

interface EmbedRequest {
  entityType: EntityType;
  entityId: string;
  text: string;
}

export async function POST(request: NextRequest) {
  try {
    const { entityType, entityId, text }: EmbedRequest = await request.json();

    // Validate inputs
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

    // Get user from session (server-side)
    const supabase = supabaseClient();
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "No authorization header" },
        { status: 401 }
      );
    }

    // Set the session from the authorization header
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

    // Initialize OpenAI client
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Call OpenAI embeddings API
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    if (!response.data || response.data.length === 0) {
      return NextResponse.json(
        { success: false, error: "No embedding data received from OpenAI" },
        { status: 500 }
      );
    }

    let embedding = response.data[0].embedding;

    // Validate embedding dimensions
    if (embedding.length !== 1536) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid embedding dimensions: expected 1536, got ${embedding.length}`,
        },
        { status: 500 }
      );
    }
    const norm = Math.hypot(...embedding);
    if (norm > 0) embedding = embedding.map((x) => x / norm);

    // Upsert to Supabase embeddings table
    const { error: upsertError } = await supabase.from("embeddings").upsert({
      entity_type: entityType,
      entity_id: entityId,
      user_id: user.id,
      model: "text-embedding-3-small",
      vector: embedding,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      return NextResponse.json(
        { success: false, error: `Database error: ${upsertError.message}` },
        { status: 500 }
      );
    }

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

const MODEL = "text-embedding-3-small";
const VERSION = "v1";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const limit = Number(url.searchParams.get("limit") ?? "20");

    console.log(
      "GET /api/embeddings called with userId:",
      userId,
      "limit:",
      limit
    );

    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the user's most recent venture from user_ventures table
    console.log("Fetching user venture for userId:", userId);
    const { data: userVenture, error: ventureErr } = await sb
      .from("user_ventures")
      .select("id, title, description, created_at, user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    console.log("User venture query result:", { userVenture, ventureErr });

    if (ventureErr || !userVenture) {
      console.log("No venture found for user:", userId, "Error:", ventureErr);
      return NextResponse.json(
        { error: "No venture found for user" },
        { status: 404 }
      );
    }

    const ideaId = userVenture.id;
    console.log("Using ideaId for KNN search:", ideaId);

    // Check if we have an embedding for this idea
    const { data: embedding, error: embErr } = await sb
      .from("embeddings")
      .select("entity_id, entity_type")
      .eq("entity_type", "idea")
      .eq("entity_id", ideaId.toString())
      .single();

    console.log("Embedding check result:", { embedding, embErr });

    if (embErr || !embedding) {
      console.log("No embedding found for idea:", ideaId);
      return NextResponse.json(
        {
          error:
            "No embedding found for this venture. Please make sure your profile is published to generate embeddings.",
          details: embErr?.message,
        },
        { status: 404 }
      );
    }

    // Use the corrected knn_candidates function
    console.log("Attempting KNN search with corrected function...");
    console.log(
      "entity_id from embeddings:",
      embedding.entity_id,
      "type:",
      typeof embedding.entity_id
    );

    const { data: cands, error: kErr } = await sb.rpc("knn_candidates_excl", {
      p_idea_id: embedding.entity_id, // Now expects text type
      p_model: MODEL,
      p_version: VERSION,
      p_limit: 100,
      p_probes: 10,
    });

    console.log("KNN candidates result:", { cands, kErr });

    if (kErr) {
      console.error("KNN function error:", kErr);
      return NextResponse.json({ error: kErr.message }, { status: 500 });
    }

    const limitedCands = Array.isArray(cands) ? cands.slice(0, limit) : [];
    console.log("Returning limited candidates:", limitedCands.length, "items");

    // Enrich candidate data with profile, venture, and preferences
    const enrichedCandidates = await Promise.all(
      limitedCands.map(async (candidate: any) => {
        const candidateUserId = candidate.user_id;

        if (!candidateUserId) {
          console.warn("Candidate missing user_id:", candidate);
          return null;
        }

        try {
          // Fetch all data in parallel
          const [profileResult, ventureResult, preferencesResult] = await Promise.all([
            sb
              .from("profiles")
              .select("name, bio, achievements, region")
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

          return {
            id: candidateUserId,
            stage: candidate.stage,
            timezone: candidate.timezone,
            availability_hours: candidate.availability_hours,
            similarity_score: candidate.similarity_score,
            profile: profileResult.data,
            venture: ventureResult.data,
            preferences: preferencesResult.data,
          };
        } catch (error) {
          console.error("Error enriching candidate data:", candidateUserId, error);
          return null;
        }
      })
    );

    // Filter out null candidates (failed to load)
    const validCandidates = enrichedCandidates.filter((c) => c !== null);

    const response = {
      items: validCandidates,
      baseVenture: userVenture, // Include the base venture info for reference
    };

    console.log("Final response with enriched data:", response);
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
