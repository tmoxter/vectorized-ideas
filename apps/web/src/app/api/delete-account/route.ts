import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function DELETE(request: NextRequest) {
  // No soft delete for now, wipe it all #TODO
  // First authenticate user then use service role for deletion
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userSupabase = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    console.log(`[delete-account] Deleting account for user ID: ${userId}`);

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    // Delete user data from all tables (in order due to foreign key constraints)
    // We do have cascading deletes set up for our tables, but we'll be explicit here
    // 1. Delete embeddings
    await adminSupabase
      .from("profile_embeddings")
      .delete()
      .eq("user_id", userId);
    await adminSupabase
      .from("venture_embeddings")
      .delete()
      .eq("user_id", userId);

    // 2. Delete interactions (both as actor and target)
    // TODO: Especially in case of "block" interactions, we would want to archive and map to user login credentials
    await adminSupabase.from("interactions").delete().eq("actor_user", userId);
    await adminSupabase.from("interactions").delete().eq("target_user", userId);
    // 3. Delete matches
    await adminSupabase.from("matches").delete().eq("user_a", userId);
    await adminSupabase.from("matches").delete().eq("user_b", userId);
    // 4. Delete user preferences and ventures
    await adminSupabase
      .from("user_cofounder_preference")
      .delete()
      .eq("user_id", userId);
    await adminSupabase.from("user_ventures").delete().eq("user_id", userId);
    // 5. Delete user data and profile
    await adminSupabase.from("user_data").delete().eq("user_id", userId);
    await adminSupabase.from("profiles").delete().eq("user_id", userId);

    // 6. Delete the auth user (will trigger cascade delete)
    const { error: deleteUserError } =
      await adminSupabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("Error deleting user from auth:", deleteUserError);
      return NextResponse.json(
        { error: "Failed to delete user account" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("[delete-account] Error during account-deletion:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
