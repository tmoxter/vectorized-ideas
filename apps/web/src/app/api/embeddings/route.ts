import "server-only";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseClient } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { extractBearerToken, authenticateUser } from "@/server/logic/auth";
import { generateAndStoreEmbedding } from "@/server/services/embeddings.service";
import { findMatchingCandidates } from "@/server/services/matching.service";

export type EntityType = "idea" | "profile";

interface EmbedRequest {
  entityType: EntityType;
  entityId: string;
  text: string;
}

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

    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { success: false, error: "No authorization header" },
        { status: 401 }
      );
    }

    const supabase = supabaseClient();
    const { user, error: authError } = await authenticateUser(
      token,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    await generateAndStoreEmbedding(
      supabase,
      user.id,
      entityType,
      entityId,
      text,
      process.env.OPENAI_API_KEY
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

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const result = await findMatchingCandidates(sb, userId, limit);
    return NextResponse.json(result);
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
