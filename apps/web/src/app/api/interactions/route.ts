import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export type InteractionAction = "like" | "pass" | "block" | "unblock";

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

    if (!["like", "pass", "block", "unblock"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'like', 'pass', 'block', or 'unblock'" },
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

    // Get current venture IDs for both actor and target users
    const [actorVenture, targetVenture] = await Promise.all([
      supabase
        .from("user_ventures")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("user_ventures")
        .select("id")
        .eq("user_id", targetUserId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const actorCurrentIdea = actorVenture.data?.id || null;
    const targetCurrentIdea = targetVenture.data?.id || null;

    // Handle different interaction types with the provided SQL logic
    if (action === "like") {
      // For 'like': insert or do nothing if already exists
      const { error: insertError } = await supabase
        .from("interactions")
        .insert({
          actor_user: user.id,
          target_user: targetUserId,
          action: "like",
          actor_current_idea: actorCurrentIdea,
          target_current_idea: targetCurrentIdea,
        })
        .select();

      if (insertError && !insertError.message.includes("duplicate")) {
        console.error("Error inserting like interaction:", insertError);
        return NextResponse.json(
          { success: false, error: `Database error: ${insertError.message}` },
          { status: 500 }
        );
      }

      // Check for reciprocal like to create a match
      const { data: reciprocal } = await supabase
        .from("interactions")
        .select("id")
        .eq("actor_user", targetUserId)
        .eq("target_user", user.id)
        .eq("action", "like")
        .limit(1);

      // If there's a reciprocal like, create a match
      if (reciprocal && reciprocal.length > 0) {
        const { error: matchError } = await supabase
          .from("matches")
          .insert({
            user_a: user.id,
            user_b: targetUserId,
            active: true,
          })
          .select();

        if (matchError && !matchError.message.includes("duplicate")) {
          console.error("Error creating match:", matchError);
          // Don't fail the request if match creation fails
          // The like was still recorded successfully
        }
      }
    } else if (action === "pass") {
      // For 'pass': insert or update created_at if already exists
      const { error: upsertError } = await supabase
        .from("interactions")
        .upsert(
          {
            actor_user: user.id,
            target_user: targetUserId,
            action: "pass",
            actor_current_idea: actorCurrentIdea,
            target_current_idea: targetCurrentIdea,
            created_at: new Date().toISOString(),
          },
        )
        .select();

      if (upsertError) {
        console.error("Error inserting pass interaction:", upsertError);
        return NextResponse.json(
          { success: false, error: `Database error: ${upsertError.message}` },
          { status: 500 }
        );
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
    } else if (action === "unblock") {
      // For 'unblock': delete the block interaction
      const { error: deleteError } = await supabase
        .from("interactions")
        .delete()
        .eq("actor_user", user.id)
        .eq("target_user", targetUserId)
        .eq("action", "block");

      if (deleteError) {
        console.error("Error unblocking user:", deleteError);
        return NextResponse.json(
          { success: false, error: `Database error: ${deleteError.message}` },
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
