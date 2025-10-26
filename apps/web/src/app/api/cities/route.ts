import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchCities } from "@/server/services/cities.service";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const country = req.nextUrl.searchParams.get("country") || null;
  const limit = Number(req.nextUrl.searchParams.get("limit") || 10);

  // Keep it quiet for a bit, start guessing at 3 chars (maybe even later?)
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    const result = await searchCities(sb, q, country, limit);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
