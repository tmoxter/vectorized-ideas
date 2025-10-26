"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ShieldOff } from "lucide-react";
import { Circles } from 'react-loader-spinner';

interface ProfileData {
  id: string;
  name: string;
  bio: string;
  achievements: string;
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

export default function BlockedProfilesPage() {
  const [blockedProfiles, setBlockedProfiles] = useState<ProfileData[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = supabaseClient();

  useEffect(() => {
    checkAuthAndLoadBlocked();
  }, []);

  const checkAuthAndLoadBlocked = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/");
      return;
    }

    setUser(session.user);
    await loadBlockedProfiles(session.user.id);
  };

  const loadBlockedProfiles = async (userId: string) => {
    setIsLoading(true);
    try {
      // Get all block interactions from this user
      const { data: interactionsData, error } = await supabase
        .from("interactions")
        .select("target_user, created_at")
        .eq("actor_user", userId)
        .eq("action", "block")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!interactionsData || interactionsData.length === 0) {
        setBlockedProfiles([]);
        setSelectedProfile(null);
        setIsLoading(false);
        return;
      }

      // Fetch profile data for all blocked users
      const profilesPromises = interactionsData.map(async (interaction) => {
        const blockedUserId = interaction.target_user;

        const [profileResult, ventureResult, preferencesResult, userDataResult] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("name, bio, achievements, city_id")
              .eq("user_id", blockedUserId)
              .maybeSingle(),
            supabase
              .from("user_ventures")
              .select("title, description")
              .eq("user_id", blockedUserId)
              .maybeSingle(),
            supabase
              .from("user_cofounder_preference")
              .select("title, description")
              .eq("user_id", blockedUserId)
              .maybeSingle(),
            supabase
              .from("user_data")
              .select("timezone, stage, availability_hours")
              .eq("user_id", blockedUserId)
              .maybeSingle(),
          ]);

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
            id: blockedUserId,
            name: profileResult.data.name || "Anonymous",
            bio: profileResult.data.bio || "",
            achievements: profileResult.data.achievements || "",
            city_name,
            country,
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

      setBlockedProfiles(profiles);
      if (profiles.length > 0) {
        setSelectedProfile(profiles[0]);
      } else {
        setSelectedProfile(null);
      }
    } catch (error) {
      console.error("Error loading blocked profiles:", error);
      setMessage("Failed to load blocked profiles");
      setBlockedProfiles([]);
      setSelectedProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (targetUserId: string) => {
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
          action: "unblock",
        }),
      });

      if (response.ok) {
        setMessage("User unblocked successfully");
        // Remove from blocked list
        await loadBlockedProfiles(user.id);
      } else {
        setMessage("Failed to unblock user");
      }
    } catch (error) {
      console.error("Error unblocking user:", error);
      setMessage("Error unblocking user");
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
        currentPage="blocked"
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-mono font-bold text-gray-900 mb-6">
            Blocked Profiles
          </h1>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 text-blue-700 border border-yellow-200 rounded font-mono text-sm">
              {message}
            </div>
          )}

          {blockedProfiles.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-6">
                <ShieldOff className="w-24 h-24 text-gray-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-2">
                no blocked profiles
              </h2>
              <p className="font-mono text-gray-600 text-sm mb-6">
                Users you block will appear here
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
              {/* Left Panel - Blocked List */}
              <div className="col-span-4 bg-white rounded-lg border border-gray-200 p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <h2 className="font-mono font-semibold text-gray-900 mb-4">
                  {blockedProfiles.length}{" "}
                  {blockedProfiles.length === 1 ? "profile" : "profiles"}
                </h2>
                <div className="space-y-2">
                  {blockedProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className={`w-full text-left p-4 rounded-lg border transition duration-200 ${
                        selectedProfile?.id === profile.id
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
                            {selectedProfile.timezone && (
                              <span>🕒 {selectedProfile.timezone}</span>
                            )}
                            {selectedProfile.stage && (
                              <span>🚀 {selectedProfile.stage}</span>
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
                            about
                          </h3>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedProfile.bio}
                          </p>
                        </section>
                      )}

                      {selectedProfile.achievements && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            experience & achievements
                          </h3>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedProfile.achievements}
                          </p>
                        </section>
                      )}

                      {selectedProfile.venture && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            venture idea
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
                            looking for
                          </h3>
                          <h4 className="font-mono font-semibold text-gray-800 mb-2">
                            {selectedProfile.preferences.title}
                          </h4>
                          <p className="font-mono text-sm text-gray-700 leading-relaxed">
                            {selectedProfile.preferences.description}
                          </p>
                        </section>
                      )}

                      {selectedProfile.availability_hours && (
                        <section>
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                            availability
                          </h3>
                          <p className="font-mono text-sm text-gray-700">
                            {selectedProfile.availability_hours}
                          </p>
                        </section>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="p-6 bg-gray-50 border-t border-gray-100">
                      <button
                        onClick={() => handleUnblock(selectedProfile.id)}
                        className="px-6 py-3 bg-black text-white rounded font-mono text-sm hover:bg-gray-800 transition duration-200"
                      >
                        unblock user
                      </button>
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

      <Footer />
    </div>
  );
}
