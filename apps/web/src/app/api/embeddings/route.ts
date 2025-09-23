import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseClient } from "@/lib/supabase";

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

    const embedding = response.data[0].embedding;
    
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