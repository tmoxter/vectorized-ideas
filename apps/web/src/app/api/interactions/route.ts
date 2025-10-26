import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractBearerToken, authenticateUser } from "@/server/logic/auth";
import { recordInteraction } from "@/server/services/interactions.service";

export type InteractionAction = "like" | "pass" | "block" | "unblock";

interface InteractionRequest {
  targetUserId: string;
  action: InteractionAction;
}

export async function POST(request: NextRequest) {
  try {
    const { targetUserId, action }: InteractionRequest = await request.json();

    if (!targetUserId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }
    if (!["like", "pass", "block", "unblock"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid action. Must be 'like', 'pass', 'block', or 'unblock'",
        },
        { status: 400 }
      );
    }

    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { success: false, error: "No authorization header" },
        { status: 401 }
      );
    }

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await recordInteraction(supabase, user.id, targetUserId, action);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error in interactions API:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
