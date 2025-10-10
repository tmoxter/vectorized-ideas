import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export type InteractionAction = "like" | "pass" | "block";

interface InteractionRequest {
  targetUserId: string;
  action: InteractionAction;
}

export async function POST(request: NextRequest) {
  try {
    const { targetUserId, action }: InteractionRequest = await request.json();

    // Validate inputs
    if (!targetUserId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (!["like", "pass", "block"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'like', 'pass', or 'block'" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "No authorization header" },
        { status: 401 }
      );
    }

    // Create supabase client for auth check
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Handle different interaction types with the provided SQL logic
    if (action === "like") {
      // For 'like': insert or do nothing if already exists
      const { error } = await supabase.rpc("insert_like_interaction", {
        p_actor_user: user.id,
        p_target_user: targetUserId,
      });

      if (error) {
        // Fallback to direct insert if RPC doesn't exist
        const { error: insertError } = await supabase
          .from("interactions")
          .insert({
            actor_user: user.id,
            target_user: targetUserId,
            action: "like",
          })
          .select();

        if (insertError && !insertError.message.includes("duplicate")) {
          console.error("Error inserting like interaction:", insertError);
          return NextResponse.json(
            { success: false, error: `Database error: ${insertError.message}` },
            { status: 500 }
          );
        }
      }
    } else if (action === "pass") {
      // For 'pass': insert or update created_at if already exists
      const { error } = await supabase.rpc("insert_pass_interaction", {
        p_actor_user: user.id,
        p_target_user: targetUserId,
      });

      if (error) {
        // Fallback to direct upsert if RPC doesn't exist
        const { error: upsertError } = await supabase
          .from("interactions")
          .upsert(
            {
              actor_user: user.id,
              target_user: targetUserId,
              action: "pass",
              created_at: new Date().toISOString(),
            },
            {
              onConflict: "actor_user,target_user,action",
            }
          )
          .select();

        if (upsertError) {
          console.error("Error inserting pass interaction:", upsertError);
          return NextResponse.json(
            { success: false, error: `Database error: ${upsertError.message}` },
            { status: 500 }
          );
        }
      }
    } else if (action === "block") {
      // For 'block': use RPC function to handle blocking logic
      const { error } = await supabase.rpc("block_user", {
        p_actor: user.id,
        p_target: targetUserId,
      });

      if (error) {
        console.error("Error blocking user:", error);
        return NextResponse.json(
          { success: false, error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }
    }

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
