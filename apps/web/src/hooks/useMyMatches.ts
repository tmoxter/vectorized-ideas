import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import type { ProfileWithDetails, ProfileData } from "@/types";

export function useMyMatches(userId: string | undefined) {
  const [matches, setMatches] = useState<ProfileWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const supabase = supabaseClient();

  useEffect(() => {
    if (userId) {
      loadMatches();
    }
  }, [userId]);

  const loadMatches = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError("");

    try {
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("user_a, user_b, created_at")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (matchesError) throw matchesError;

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        return;
      }

      const otherUserIds = matchesData.map((match) =>
        match.user_a === userId ? match.user_b : match.user_a
      );

      const profilesPromises = otherUserIds.map(async (matchedUserId) => {
        const [
          profileResult,
          ventureResult,
          preferencesResult,
          userDataResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("name, bio, achievements, experience, education, city_id")
            .eq("user_id", matchedUserId)
            .maybeSingle(),
          supabase
            .from("user_ventures")
            .select("title, description")
            .eq("user_id", matchedUserId)
            .maybeSingle(),
          supabase
            .from("user_cofounder_preference")
            .select("title, description")
            .eq("user_id", matchedUserId)
            .maybeSingle(),
          supabase
            .from("user_data")
            .select("timezone, stage, availability_hours")
            .eq("user_id", matchedUserId)
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
            id: matchedUserId,
            profile: profile,
            timezone: userDataResult.data?.timezone,
            stage: userDataResult.data?.stage,
            availability_hours: userDataResult.data?.availability_hours,
            venture: ventureResult.data || undefined,
            preferences: preferencesResult.data || undefined,
          };
        }
        return null;
      });

      const profiles = (await Promise.all(profilesPromises)).filter(
        (p) => p !== null
      ) as ProfileWithDetails[];

      setMatches(profiles);
    } catch (err) {
      console.error("Error loading matches:", err);
      setError("Failed to load matches");
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { matches, isLoading, error, reload: loadMatches };
}
