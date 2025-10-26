import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    const sb = createClient(url, serviceRoleKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "No authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await sb.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Get user's most recent venture to use as idea_id
    const { data: venture, error: ventureError } = await sb
      .from("user_ventures")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[banner-counts] User ID:", user.id);
    console.log("[banner-counts] Venture query result:", { venture, ventureError });

    if (ventureError) {
      console.error("Error fetching user venture:", ventureError);
      return NextResponse.json(
        { error: "Error fetching user venture" },
        { status: 500 }
      );
    }

    // If user doesn't have a venture yet, return default counts
    if (!venture) {
      console.log("[banner-counts] No venture found, returning default counts");
      return NextResponse.json({
        total_profiles: 0,
        related_topics: 0,
      });
    }

    // Get the version from the embeddings table for this venture
    const { data: embedding, error: embeddingError } = await sb
      .from("embeddings")
      .select("version")
      .eq("entity_id", venture.id)
      .eq("entity_type", "idea")
      .maybeSingle();

    console.log("[banner-counts] Embedding query result:", { embedding, embeddingError });

    // Default to "1" if no embedding found
    const version = embedding?.version || "1";

    console.log("[banner-counts] Calling banner_counts RPC with params:", {
      p_user: user.id,
      p_idea_id: venture.id,
      p_model: "text-embedding-3-small",
      p_version: version,
    });

    // Call the banner_counts RPC function
    const { data, error } = await sb.rpc("banner_counts", {
      p_user: user.id,
      p_idea_id: venture.id,
      p_model: "text-embedding-3-small",
      p_version: version,
    });

    console.log("[banner-counts] RPC result:", { data, error });

    if (error) {
      console.error("[banner-counts] Error calling banner_counts RPC:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.log("[banner-counts] RPC returned no data, returning default counts");
      return NextResponse.json({
        total_profiles: 0,
        related_topics: 0,
      });
    }

    // Map the RPC response fields to expected frontend fields
    const result = {
      total_profiles: data[0].loc_count || 0,
      related_topics: data[0].sim_count || 0,
    };

    console.log("[banner-counts] Returning mapped result:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/banner-counts error:", error);
    return NextResponse.json(
      {
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
