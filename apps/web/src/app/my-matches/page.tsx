"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface ProfileData {
  id: string;
  name: string;
  bio: string;
  achievements: string;
  region: string;
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
              .select("name, bio, achievements, region")
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
          return {
            id: matchedUserId,
            name: profileResult.data.name || "Anonymous",
            bio: profileResult.data.bio || "",
            achievements: profileResult.data.achievements || "",
            region: profileResult.data.region || "",
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
      ) as ProfileData[];

      setMatches(profiles);
      if (profiles.length > 0) {
        setSelectedMatch(profiles[0]);
      }
    } catch (error) {
      console.error("Error loading matches:", error);
      setMessage("Failed to load matches");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlock = async (targetUserId: string) => {
    if (!user) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

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
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="font-mono text-gray-600">loading matches...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 bg-white">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/")}
              className="flex items-center space-x-3 hover:opacity-80"
            >
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                <span className="text-white font-mono text-sm">λ</span>
              </div>
              <span className="font-mono text-lg text-gray-900">
                vectorized-ideas
              </span>
            </button>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => router.push("/matches")}
              className="font-mono text-sm text-gray-600 hover:text-gray-900"
            >
              discover
            </button>
            <button
              onClick={() => router.push("/my-matches")}
              className="font-mono text-sm text-gray-900 font-semibold"
            >
              my matches
            </button>
            <button
              onClick={() => router.push("/skipped")}
              className="font-mono text-sm text-gray-600 hover:text-gray-900"
            >
              skipped
            </button>
            <button
              onClick={() => router.push("/blocked")}
              className="font-mono text-sm text-gray-600 hover:text-gray-900"
            >
              blocked
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="font-mono text-sm text-gray-600 hover:text-gray-900"
            >
              profile
            </button>
            <span className="font-mono text-sm text-gray-600">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="font-mono text-sm text-gray-600 hover:text-gray-900"
            >
              logout
            </button>
          </div>
        </nav>
      </header>

      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-mono font-bold text-gray-900 mb-6">
            my matches
          </h1>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono text-sm">
              {message}
            </div>
          )}

          {matches.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🤝</div>
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
                discover co-founders
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
                      {match.region && (
                        <div className="font-mono text-sm text-gray-600 mt-1">
                          📍 {match.region}
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
                            {selectedMatch.region && (
                              <span>📍 {selectedMatch.region}</span>
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
                            about
                          </h3>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedMatch.bio}
                          </p>
                        </section>
                      )}

                      {selectedMatch.achievements && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            experience & achievements
                          </h3>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedMatch.achievements}
                          </p>
                        </section>
                      )}

                      {selectedMatch.venture && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            venture idea
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
                      <button
                        onClick={() => handleBlock(selectedMatch.id)}
                        className="px-6 py-3 border border-red-300 bg-red-50 text-red-700 rounded font-mono text-sm hover:bg-red-100 transition duration-200"
                      >
                        block user
                      </button>
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
    </div>
  );
}
