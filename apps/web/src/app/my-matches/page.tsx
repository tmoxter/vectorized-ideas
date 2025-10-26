"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Users, ShieldX } from "lucide-react";
import { Circles } from 'react-loader-spinner';

interface ProfileData {
  id: string;
  name: string;
  bio: string;
  achievements: string;
  experience: string;
  education: string;
  city_name?: string;
  country?: string;
  timezone?: string;
  stage?: string;
  availability_hours?: string;
  venture?: {
    title: string;
    description: string;
  };
  preferences?: {
    title: string;
    description: string;
  };
}

export default function MyMatchesPage() {
  const [matches, setMatches] = useState<ProfileData[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const router = useRouter();
  const supabase = supabaseClient();

  useEffect(() => {
    checkAuthAndLoadMatches();
  }, []);

  const checkAuthAndLoadMatches = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/");
      return;
    }

    setUser(session.user);
    await loadMatches(session.user.id);
  };

  const loadMatches = async (userId: string) => {
    setIsLoading(true);
    try {
      // Get all matches where user is either user_a or user_b
      const { data: matchesData, error } = await supabase
        .from("matches")
        .select("user_a, user_b, created_at")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        setIsLoading(false);
        return;
      }

      // Extract the other user's ID from each match
      const otherUserIds = matchesData.map((match) =>
        match.user_a === userId ? match.user_b : match.user_a
      );

      // Fetch profile data for all matched users
      const profilesPromises = otherUserIds.map(async (matchedUserId) => {
        const [profileResult, ventureResult, preferencesResult, userDataResult] =
          await Promise.all([
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
          // Fetch city data if city_id exists
          let city_name: string | undefined;
          let country: string | undefined;

          console.log("Profile data for user", matchedUserId, ":", profileResult.data);
          console.log("City ID:", profileResult.data.city_id);

          if (profileResult.data.city_id) {
            const { data: cityData, error: cityError } = await supabase
              .from("cities")
              .select("name, country_name")
              .eq("id", profileResult.data.city_id)
              .maybeSingle();

            console.log("City data:", cityData, "City error:", cityError);

            if (cityData) {
              city_name = cityData.name;
              country = cityData.country_name;
              console.log("Set city_name:", city_name, "country:", country);
            }
          }

          const result = {
            id: matchedUserId,
            name: profileResult.data.name || "Anonymous",
            bio: profileResult.data.bio || "",
            achievements: profileResult.data.achievements || "",
            experience: profileResult.data.experience || "",
            education: profileResult.data.education || "",
            city_name,
            country,
            timezone: userDataResult.data?.timezone,
            stage: userDataResult.data?.stage,
            availability_hours: userDataResult.data?.availability_hours,
            venture: ventureResult.data || undefined,
            preferences: preferencesResult.data || undefined,
          };

          console.log("Final result for user", matchedUserId, ":", result);
          return result;
        }
        return null;
      });

      const profiles = (await Promise.all(profilesPromises)).filter(
        (p) => p !== null
      ) as ProfileData[];

      setMatches(profiles);
      if (profiles.length > 0) {
        setSelectedMatch(profiles[0]);
      } else {
        setSelectedMatch(null);
      }
    } catch (error) {
      console.error("Error loading matches:", error);
      setMessage("Failed to load matches");
      setMatches([]);
      setSelectedMatch(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlock = async (targetUserId: string) => {
    if (!user) return;

    setIsSubmitting(true);
    setShowBlockConfirm(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetUserId,
          action: "block",
        }),
      });

      if (response.ok) {
        setMessage("User blocked successfully");
        // Reload matches to update the list
        await loadMatches(user.id);
      } else {
        setMessage("Failed to block user");
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      setMessage("Error blocking user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Circles color="#111827" width="24" height="24" visible={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-breathe pb-10">
      <Navigation
        currentPage="my-matches"
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-mono font-bold text-gray-900 mb-6">
            <span className="highlight-brush">Matches</span>
          </h1>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 text-blue-700 border border-yellow-200 rounded font-mono text-sm">
              {message}
            </div>
          )}

          {matches.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-6">
                <Users className="w-24 h-24 text-gray-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-2">
                no matches yet
              </h2>
              <p className="font-mono text-gray-600 text-sm mb-6">
                Start swiping to find your co-founder!
              </p>
              <button
                onClick={() => router.push("/matches")}
                className="px-6 py-3 bg-black text-white rounded font-mono hover:bg-gray-800 transition duration-200"
              >
                Discover co-founders
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              {/* Left Panel - Match List */}
              <div className="col-span-4 bg-white rounded-lg border border-gray-200 p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <h2 className="font-mono font-semibold text-gray-900 mb-4">
                  {matches.length} {matches.length === 1 ? "match" : "matches"}
                </h2>
                <div className="space-y-2">
                  {matches.map((match) => (
                    <button
                      key={match.id}
                      onClick={() => setSelectedMatch(match)}
                      className={`w-full text-left p-4 rounded-lg border transition duration-200 ${
                        selectedMatch?.id === match.id
                          ? "border-black bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-mono font-semibold text-gray-900">
                        {match.name}
                      </div>
                      {match.city_name && match.country && (
                        <div className="font-mono text-sm text-gray-600 mt-1">
                          📍 {match.city_name}, {match.country}
                        </div>
                      )}
                      {match.venture && (
                        <div className="font-mono text-xs text-gray-500 mt-2 line-clamp-2">
                          {match.venture.title}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Panel - Selected Match Detail */}
              <div className="col-span-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
                {selectedMatch ? (
                  <>
                    {/* Profile Header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-mono font-bold text-gray-900 mb-2">
                            {selectedMatch.name}
                          </h2>
                          <div className="flex items-center space-x-4 text-sm font-mono text-gray-600">
                            {selectedMatch.city_name && selectedMatch.country && (
                              <span>📍 {selectedMatch.city_name}, {selectedMatch.country}</span>
                            )}
                            {selectedMatch.timezone && (
                              <span>🕒 {selectedMatch.timezone}</span>
                            )}
                            {selectedMatch.stage && (
                              <span>🚀 {selectedMatch.stage}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Profile Content */}
                    <div className="p-6 space-y-8 max-h-[calc(100vh-400px)] overflow-y-auto">
                      {selectedMatch.bio && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            Bio
                          </h3>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedMatch.bio}
                          </p>
                        </section>
                      )}

                      {selectedMatch.achievements && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            Personal Achievement
                          </h3>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedMatch.achievements}
                          </p>
                        </section>
                      )}

                      {selectedMatch.experience && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            Experience
                          </h3>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedMatch.experience}
                          </p>
                        </section>
                      )}

                      {selectedMatch.education && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            Education
                          </h3>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedMatch.education}
                          </p>
                        </section>
                      )}

                      {selectedMatch.venture && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            Venture Idea
                          </h3>
                          <h4 className="font-mono font-semibold text-gray-800 mb-2">
                            {selectedMatch.venture.title}
                          </h4>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedMatch.venture.description}
                          </p>
                        </section>
                      )}

                      {selectedMatch.preferences && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            looking for
                          </h3>
                          <h4 className="font-mono font-semibold text-gray-800 mb-2">
                            {selectedMatch.preferences.title}
                          </h4>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedMatch.preferences.description}
                          </p>
                        </section>
                      )}

                      {selectedMatch.availability_hours && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            availability
                          </h3>
                          <p className="font-mono text-sm text-gray-700">
                            {selectedMatch.availability_hours}
                          </p>
                        </section>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="p-6 bg-gray-50 border-t border-gray-100">
                      {!showBlockConfirm ? (
                        <div className="flex justify-center">
                          <button
                            onClick={() => setShowBlockConfirm(true)}
                            disabled={isSubmitting}
                            className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded font-mono text-xs transition duration-200 disabled:opacity-50"
                          >
                            <ShieldX className="w-3 h-3" />
                            <span>Block User</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-red-50 p-4 rounded border border-red-200">
                            <p className="font-mono text-sm text-red-800 mb-2">
                              <strong>Block this user?</strong>
                            </p>
                            <p className="font-mono text-xs text-red-700">
                              They won't appear in your matches again and you won't see each other.
                            </p>
                          </div>
                          <div className="flex justify-center space-x-3">
                            <button
                              onClick={() => handleBlock(selectedMatch.id)}
                              disabled={isSubmitting}
                              className="px-6 py-2 bg-red-600 text-white rounded font-mono text-sm hover:bg-red-700 transition duration-200 disabled:opacity-50"
                            >
                              {isSubmitting ? "Blocking..." : "Confirm Block"}
                            </button>
                            <button
                              onClick={() => setShowBlockConfirm(false)}
                              disabled={isSubmitting}
                              className="px-6 py-2 border border-gray-300 rounded font-mono text-sm hover:bg-gray-50 transition duration-200 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-gray-500 font-mono">
                    Select a match to view details
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
