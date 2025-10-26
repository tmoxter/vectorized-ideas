import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import type { ProfileWithDetails, ProfileData } from "@/types";

export function useSkippedProfiles(userId: string | undefined) {
  const [profiles, setProfiles] = useState<ProfileWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const supabase = supabaseClient();

  useEffect(() => {
    if (userId) {
      loadProfiles();
    }
  }, [userId]);

  const loadProfiles = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError("");

    try {
      const { data: interactionsData, error: interactionsError } =
        await supabase
          .from("interactions")
          .select("target_user, created_at")
          .eq("actor_user", userId)
          .eq("action", "pass")
          .order("created_at", { ascending: false });

      if (interactionsError) throw interactionsError;

      if (!interactionsData || interactionsData.length === 0) {
        setProfiles([]);
        return;
      }

      const profilesPromises = interactionsData.map(async (interaction) => {
        const skippedUserId = interaction.target_user;

        const [profileResult, ventureResult, preferencesResult] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("name, bio, achievements, experience, education, city_id")
              .eq("user_id", skippedUserId)
              .limit(1)
              .maybeSingle(),
            supabase
              .from("user_ventures")
              .select("title, description")
              .eq("user_id", skippedUserId)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("user_cofounder_preference")
              .select("title, description")
              .eq("user_id", skippedUserId)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

        if (profileResult.data) {
          let city_name: string | undefined;
          let country: string | undefined;

          if (profileResult.data.city_id) {
            const { data: cityData } = await supabase
              .from("cities")
              .select("name, country_name")
              .eq("id", profileResult.data.city_id)
              .maybeSingle();

            if (cityData) {
              city_name = cityData.name;
              country = cityData.country_name;
            }
          }
          const profile: ProfileData = {
            name: profileResult.data.name || "Unknown",
            bio: profileResult.data.bio || "",
            achievements: profileResult.data.achievements || "",
            experience: profileResult.data.experience || "",
            education: profileResult.data.education || "",
            city_name,
            country,
          };
          return {
            id: skippedUserId,
            profile: profile,
            venture: ventureResult.data || undefined,
            preferences: preferencesResult.data || undefined,
          };
        }

        return null;
      });

      const allProfiles = await Promise.all(profilesPromises);
      const validProfiles = allProfiles.filter(
        (p) => p !== null
      ) as ProfileWithDetails[];

      console.log("[skipped] Loaded skipped profiles:", validProfiles.length);
      setProfiles(validProfiles);
    } catch (err) {
      console.error("Error loading skipped profiles:", err);
      setError("Failed to load skipped profiles");
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { profiles, isLoading, error, reload: loadProfiles };
}
