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

    // Get user's most recent venture to compute similarities
    const { data: venture, error: ventureError } = await sb
      .from("user_ventures")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ventureError) {
      console.error("Error fetching user venture:", ventureError);
      return NextResponse.json(
        { error: "Error fetching user venture" },
        { status: 500 }
      );
    } else {
      console.log("[banner-counts] Retrieved latest venture for active user");
    }

    // If user doesn't have a venture yet, return default counts
    // TODO: We can still compute total_profiles based on location even without a venture
    if (!venture) {
      console.log("[banner-counts] No venture found, returning default counts");
      return NextResponse.json({
        total_profiles: 0,
        related_topics: 0,
      });
    }

    // Get the embedding version for the active embedding of this venture to only compute
    // similarities based on the same model/version
    const { data: embedding, error: embeddingError } = await sb
      .from("embeddings")
      .select("version")
      .eq("entity_id", venture.id)
      .eq("entity_type", "idea")
      .maybeSingle();

    // Default to "0" if no embedding found, will not lead to any matches
    const version = embedding?.version || "0";
    console.log(
      "[banner-counts] Calling banner_counts RPC with embedding params:",
      {
        p_model: "text-embedding-3-small",
        p_version: version,
      }
    );
    const { data, error } = await sb.rpc("banner_counts", {
      p_user: user.id,
      p_idea_id: venture.id,
      p_model: "text-embedding-3-small",
      p_version: version,
    });
    if (error) {
      console.error("[banner-counts] Error calling banner_counts RPC:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.log("[banner-counts] RPC returned no data, returning 0 counts");
      return NextResponse.json({
        total_profiles: 0,
        related_topics: 0,
      });
    }
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
