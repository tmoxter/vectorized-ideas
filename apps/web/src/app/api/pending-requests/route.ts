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

    const params = new URL(req.url).searchParams;
    const limit = Number(params.get("limit") ?? 50);
    const offset = Number(params.get("offset") ?? 0);

    console.log(
      `[pending-requests] Fetching pending requests for user ID: ${user.id}, limit: ${limit}, offset: ${offset}`
    );
    const { data, error } = await sb.rpc("pending_requests", {
      p_user: user.id,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      console.error("Error fetching pending requests:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich the data with profile, venture, and preferences information
    const enrichedData = await Promise.all(
      (data || []).map(async (item: any) => {
        const targetUserId = item.user_id;

        if (!targetUserId) {
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
                .eq("user_id", targetUserId)
                .maybeSingle(),
              sb
                .from("user_ventures")
                .select("title, description")
                .eq("user_id", targetUserId)
                .maybeSingle(),
              sb
                .from("user_cofounder_preference")
                .select("title, description")
                .eq("user_id", targetUserId)
                .maybeSingle(),
            ]);

          let cityData = null;
          if (profileResult.data?.city_id) {
            const { data: city } = await sb
              .from("cities")
              .select("name, country_name")
              .eq("id", profileResult.data.city_id)
              .maybeSingle();

            if (city) {
              cityData = { city_name: city.name, country: city.country_name };
            }
          }

          return {
            id: targetUserId,
            stage: item.stage,
            timezone: item.timezone,
            availability_hours: item.availability_hours,
            created_at: item.created_at,
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
            "Error enriching pending request data:",
            targetUserId,
            error
          );
          return null;
        }
      })
    );

    // Filter out null entries
    const validData = enrichedData.filter((item) => item !== null);

    return NextResponse.json({ items: validData });
  } catch (error) {
    console.error("GET /api/pending-requests error:", error);
    return NextResponse.json(
      {
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
