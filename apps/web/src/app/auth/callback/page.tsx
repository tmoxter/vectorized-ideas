"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Circles } from "react-loader-spinner";

export default function AuthCallback() {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = supabaseClient();

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          // Allways go back to landing page if there's no session
          router.push("/");
          return;
        }

        // If users have a profile, redirect to home, else to profile setup
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
        if (profileData) {
          router.push("/home");
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
        <Circles color="#111827" width="24" height="24" visible={true} />
      </div>
    );
  }

  return null;
}
