import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const country = req.nextUrl.searchParams.get("country") || null;
  const limit = Number(req.nextUrl.searchParams.get("limit") || 10);

  if (q.length < 2) {
    return NextResponse.json({ items: [] }); // keep it quiet for short inputs
  }

  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("search_cities", {
    p_q: q,
    p_country_iso2: country,
    p_limit: limit,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: (data ?? []).map((d: any) => ({
      id: d.id,
      label: `${d.name}${d.admin1 ? `, ${d.admin1}` : ""} (${d.country_name})`,
      name: d.name,
      admin1: d.admin1,
      country: d.country_name,
      iso2: d.country_iso2,
      lat: d.lat,
      lon: d.lon,
      population: d.population,
    })),
  });
}
