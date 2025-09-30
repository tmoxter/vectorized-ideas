import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseClient } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
//import { rescoreBlend } from "@/server/matching";

export type EntityType = 'idea' | 'profile';

interface EmbedRequest {
  entityType: EntityType;
  text: string;
}

export async function POST(request: NextRequest) {
  try {
    const { entityType, text }: EmbedRequest = await request.json();

    // Validate inputs
    if (!entityType || !text) {
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
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "No authorization header" },
        { status: 401 }
      );
    }

    // Set the session from the authorization header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
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
      model: 'text-embedding-3-small',
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
          error: `Invalid embedding dimensions: expected 1536, got ${embedding.length}` 
        },
        { status: 500 }
      );
    }
    const norm = Math.hypot(...embedding);
    if (norm > 0) embedding = embedding.map(x => x / norm);

    // Upsert to Supabase embeddings table
    const { error: upsertError } = await supabase
      .from('embeddings')
      .upsert({
        entity_type: entityType,
        user_id: user.id,
        model: 'text-embedding-3-small',
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
    console.error('Error in embedding API:', error);
    
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { success: false, error: `OpenAI API error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}

const MODEL = "text-embedding-3-small";
const VERSION = "v1";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the user's most recent venture from user_ventures table
  const { data: userVenture, error: ventureErr } = await sb
    .from("user_ventures")
    .select("id, title, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (ventureErr || !userVenture) {
    return NextResponse.json({ error: "No venture found for user" }, { status: 404 });
  }

  const ideaId = userVenture.id;

  const { data: cands, error: kErr } = await sb.rpc("knn_candidates", {
    p_idea_id: ideaId,
    p_model: MODEL,
    p_version: VERSION,
    p_limit: 100,
    p_probes: 10
  });
  if (kErr) return NextResponse.json({ error: kErr.message }, { status: 500 });

  //const rescored = rescoreBlend(ventureInfo, cands).slice(0, limit);
  const limitedCands = Array.isArray(cands) ? cands.slice(0, limit) : [];
  return NextResponse.json({
    items: limitedCands,
    baseVenture: userVenture // Include the base venture info for reference
  });
}