import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractBearerToken, authenticateUser } from "@/server/logic/auth";
import { getBannerCounts } from "@/server/services/matching.service";

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

    const token = extractBearerToken(req.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { error: "No authorization header" },
        { status: 401 }
      );
    }

    const { user, error: authError } = await authenticateUser(
      token,
      url,
      serviceRoleKey
    );
    if (authError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const sb = createClient(url, serviceRoleKey);
    const result = await getBannerCounts(sb, user.id);
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
