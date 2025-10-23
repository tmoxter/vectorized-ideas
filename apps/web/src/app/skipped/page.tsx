"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { UserX, ShieldX } from "lucide-react";
import { Circles } from 'react-loader-spinner';

interface ProfileData {
  user_id: string;
  name: string;
  bio: string;
  achievements: string;
  city_name?: string;
  country?: string;
  venture?: {
    title: string;
    description: string;
  };
  preferences?: {
    title: string;
    description: string;
  };
}

export default function SkippedProfilesPage() {
  const [skippedProfiles, setSkippedProfiles] = useState<ProfileData[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const router = useRouter();
  const supabase = supabaseClient();

  useEffect(() => {
    checkAuthAndLoadSkipped();
  }, []);

  const checkAuthAndLoadSkipped = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/");
      return;
    }

    setUser(session.user);
    await loadSkippedProfiles(session.user.id);
  };

  const loadSkippedProfiles = async (userId: string) => {
    setIsLoading(true);
    try {
      // Get all pass interactions from this user
      const { data: interactionsData, error } = await supabase
        .from("interactions")
        .select("target_user, created_at")
        .eq("actor_user", userId)
        .eq("action", "pass")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!interactionsData || interactionsData.length === 0) {
        setSkippedProfiles([]);
        setSelectedProfile(null);
        setIsLoading(false);
        return;
      }

      // Fetch profile data for all skipped users
      const profilesPromises = interactionsData.map(async (interaction) => {
        const skippedUserId = interaction.target_user;

        const [profileResult, ventureResult, preferencesResult] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("name, bio, achievements, city_id")
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

          // Only require profile to exist - venture and preferences are optional
          if (profileResult.data) {
            // Fetch city data if city_id exists
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

            return {
              user_id: skippedUserId,
              name: profileResult.data.name || "Anonymous",
              bio: profileResult.data.bio || "",
              achievements: profileResult.data.achievements || "",
              city_name,
              country,
              venture: ventureResult.data ? ventureResult.data : undefined,
              preferences: preferencesResult.data ? preferencesResult.data : undefined,
            };
          }

          return null;
        });
        
        const allProfiles = await Promise.all(profilesPromises);
      const profiles = allProfiles.filter((p) => p !== null) as ProfileData[];
      console.log("Loaded skipped profiles:", profiles.length);

      setSkippedProfiles(profiles);
      if (profiles.length > 0) {
        setSelectedProfile(profiles[0]);
      } else {
        setSelectedProfile(null);
      }
    } catch (error) {
      console.error("Error loading skipped profiles:", error);
      setMessage("Failed to load skipped profiles");
      setSkippedProfiles([]);
      setSelectedProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (targetUserId: string) => {
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
          action: "like",
        }),
      });

      if (response.ok) {
        setMessage("User liked! They'll be moved to matches if they like you back.");
        // Remove from skipped list
        await loadSkippedProfiles(user.id);
      } else {
        setMessage("Failed to like user");
      }
    } catch (error) {
      setMessage("Error liking user");
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
        // Remove from skipped list
        await loadSkippedProfiles(user.id);
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
    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentPage="skipped"
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-mono font-bold text-gray-900 mb-6">
            <span className="highlight-brush">Skipped Profiles</span>
          </h1>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono text-sm">
              {message}
            </div>
          )}

          {skippedProfiles.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-6">
                <UserX className="w-24 h-24 text-gray-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-2">
                no skipped profiles
              </h2>
              <p className="font-mono text-gray-600 text-sm mb-6">
                Profiles you pass on will appear here
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
              {/* Left Panel - Skipped List */}
              <div className="col-span-4 bg-white rounded-lg border border-gray-200 p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <h2 className="font-mono font-semibold text-gray-900 mb-4">
                  {skippedProfiles.length}{" "}
                  {skippedProfiles.length === 1 ? "profile" : "profiles"}
                </h2>
                <div className="space-y-2">
                  {skippedProfiles.map((profile) => (
                    <button
                      key={profile.user_id}
                      onClick={() => setSelectedProfile(profile)}
                      className={`w-full text-left p-4 rounded-lg border transition duration-200 ${
                        selectedProfile?.user_id === profile.user_id
                          ? "border-black bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-mono font-semibold text-gray-900">
                        {profile.name}
                      </div>
                      {profile.city_name && profile.country && (
                        <div className="font-mono text-sm text-gray-600 mt-1">
                          📍 {profile.city_name}, {profile.country}
                        </div>
                      )}
                      {profile.venture && (
                        <div className="font-mono text-xs text-gray-500 mt-2 line-clamp-2">
                          {profile.venture.title}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Panel - Selected Profile Detail */}
              <div className="col-span-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
                {selectedProfile ? (
                  <>
                    {/* Profile Header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-mono font-bold text-gray-900 mb-2">
                            {selectedProfile.name}
                          </h2>
                          <div className="flex items-center space-x-4 text-sm font-mono text-gray-600">
                            {selectedProfile.city_name && selectedProfile.country && (
                              <span>📍 {selectedProfile.city_name}, {selectedProfile.country}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Profile Content */}
                    <div className="p-6 space-y-8 max-h-[calc(100vh-400px)] overflow-y-auto">
                      {selectedProfile.bio && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            Bio
                          </h3>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedProfile.bio}
                          </p>
                        </section>
                      )}

                      {selectedProfile.achievements && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            Personal Achievement
                          </h3>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedProfile.achievements}
                          </p>
                        </section>
                      )}

                      {selectedProfile.venture && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            Venture Idea
                          </h3>
                          <h4 className="font-mono font-semibold text-gray-800 mb-2">
                            {selectedProfile.venture.title}
                          </h4>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedProfile.venture.description}
                          </p>
                        </section>
                      )}

                      {selectedProfile.preferences && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            Co-founder Preferences
                          </h3>
                          <h4 className="font-mono font-semibold text-gray-800 mb-2">
                            {selectedProfile.preferences.title}
                          </h4>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedProfile.preferences.description}
                          </p>
                        </section>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="p-6 bg-gray-50 border-t border-gray-100">
                      {!showBlockConfirm ? (
                        <>
                          <div className="flex justify-center space-x-4">
                            <button
                              onClick={() => handleLike(selectedProfile.user_id)}
                              disabled={isSubmitting}
                              className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-white bg-gray-900 border border-gray-900 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-transform duration-150 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(0,0,0,0.30)] active:translate-y-0 active:shadow-[0_6px_14px_rgba(0,0,0,0.22)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.35),rgba(255,255,255,0)_38%)] after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:opacity-0 group-hover:after:opacity-100 after:transition-opacity after:duration-300 after:bg-[radial-gradient(120%_60%_at_50%_-20%,rgba(255,255,255,0.25),rgba(255,255,255,0))]"
                            >
                              {isSubmitting ? "saving..." : "Let's connect"}
                            </button>
                          </div>

                          {/* Block Button */}
                          <div className="mt-4 flex justify-center">
                            <button
                              onClick={() => setShowBlockConfirm(true)}
                              disabled={isSubmitting}
                              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded font-mono text-xs transition duration-200 disabled:opacity-50"
                            >
                              <ShieldX className="w-3 h-3" />
                              <span>Block User</span>
                            </button>
                          </div>
                        </>
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
                              onClick={() => handleBlock(selectedProfile.user_id)}
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
                    Select a profile to view details
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
