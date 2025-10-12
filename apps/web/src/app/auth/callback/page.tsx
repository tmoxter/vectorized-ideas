"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = supabaseClient();

      try {
        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          // No session, redirect to home
          router.push("/");
          return;
        }

        // Check if user has a profile in the profiles table
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("Error checking profile:", error);
          // On error, default to profile setup page
          router.push("/profile");
          return;
        }

        // If profile exists, redirect to discover page
        // Otherwise, redirect to profile setup page
        if (profileData) {
          router.push("/matches");
        } else {
          router.push("/profile");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        router.push("/profile");
      } finally {
        setIsChecking(false);
      }
    };

    handleAuthCallback();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="font-mono text-gray-600">checking your profile...</div>
      </div>
    );
  }

  return null;
}
