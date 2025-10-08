"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  embedProfile,
  embedIdea,
  createProfileEmbeddingText,
  createVentureEmbeddingText,
} from "@/lib/embeddings-client";

interface ProfileData {
  name: string;
  bio: string;
  achievements: string;
  region: string;
  venture_title: string;
  venture_description: string;
  cofounder_preferences_title: string;
  cofounder_preferences_description: string;
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    bio: "",
    achievements: "",
    region: "",
    venture_title: "",
    venture_description: "",
    cofounder_preferences_title: "",
    cofounder_preferences_description: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<any>(null);

  const router = useRouter();
  const supabase = supabaseClient();

  useEffect(() => {
    checkAuth();
    loadProfile();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/");
      return;
    }
    setUser(session.user);
  };

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Load data from all three tables
      const [profileResult, ventureResult, preferencesResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single(),
          supabase
            .from("user_ventures")
            .select("*")
            .eq("user_id", session.user.id)
            .single(),
          supabase
            .from("user_cofounder_preferences")
            .select("*")
            .eq("user_id", session.user.id)
            .single(),
        ]);

      setProfileData({
        name: profileResult.data?.name || "",
        bio: profileResult.data?.bio || "",
        achievements: profileResult.data?.achievements || "",
        region: profileResult.data?.region || "",
        venture_title: ventureResult.data?.title || "",
        venture_description: ventureResult.data?.description || "",
        cofounder_preferences_title: preferencesResult.data?.title || "",
        cofounder_preferences_description:
          preferencesResult.data?.description || "",
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveProfile = async (publish: boolean = false) => {
    if (!user) return;

    setIsSaving(true);
    setMessage("");

    try {
      const now = new Date().toISOString();

      // Prepare data for all three tables
      const profilePayload = {
        user_id: user.id,
        name: profileData.name,
        bio: profileData.bio,
        achievements: profileData.achievements,
        region: profileData.region,
        is_published: publish,
        updated_at: now,
      };

      const venturePayload = {
        user_id: user.id,
        title: profileData.venture_title,
        description: profileData.venture_description,
        updated_at: now,
      };

      const preferencesPayload = {
        user_id: user.id,
        title: profileData.cofounder_preferences_title,
        description: profileData.cofounder_preferences_description,
        updated_at: now,
      };

      // Save to all three tables
      const [profileResult, ventureResult, preferencesResult] =
        await Promise.all([
          supabase.from("profiles").upsert(profilePayload),
          supabase.from("user_ventures").upsert(venturePayload),
          supabase.from("user_cofounder_preference").upsert(preferencesPayload),
        ]);

      // Check for errors in any of the operations
      const errors = [
        profileResult.error,
        ventureResult.error,
        preferencesResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        setMessage(
          "Error saving profile: " + errors.map((e) => e!.message).join(", ")
        );
      } else {
        // Generate embeddings after successful save
        try {
          const embeddingPromises = [];

          // Generate profile embedding if profile data exists
          if (
            profileData.name ||
            profileData.bio ||
            profileData.achievements ||
            profileData.region
          ) {
            const profileText = createProfileEmbeddingText({
              name: profileData.name,
              bio: profileData.bio,
              achievements: profileData.achievements,
              region: profileData.region,
            });
            if (profileText.trim()) {
              embeddingPromises.push(embedProfile(user.id, profileText));
            }
          }

          // Generate venture embedding if venture data exists - need to get the venture ID
          if (profileData.venture_title || profileData.venture_description) {
            // Get the venture ID from the venture result (which was just saved)
            const ventureText = createVentureEmbeddingText({
              title: profileData.venture_title,
              description: profileData.venture_description,
            });
            if (ventureText.trim()) {
              // We need to get the venture ID that was just created/updated
              // Let's fetch the most recent venture for this user
              const { data: recentVenture } = await supabase
                .from("user_ventures")
                .select("id")
                .eq("user_id", user.id)
                .order("updated_at", { ascending: false })
                .limit(1)
                .single();

              if (recentVenture) {
                embeddingPromises.push(
                  embedIdea(recentVenture.id, ventureText)
                );
              }
            }
          }

          // Execute all embedding operations
          if (embeddingPromises.length > 0) {
            const embeddingResults = await Promise.all(embeddingPromises);
            const embeddingErrors = embeddingResults.filter(
              (result) => !result.success
            );

            if (embeddingErrors.length > 0) {
              const errorMessages = embeddingErrors
                .map((e) => e.error)
                .join(", ");
              setMessage(
                publish
                  ? `Profile published! Embedding errors: ${errorMessages}`
                  : `Profile saved! Embedding errors: ${errorMessages}`
              );
            } else {
              if (publish) {
                setMessage(
                  "Profile published successfully! Redirecting to matches..."
                );
                // Redirect to matches page after successful publish
                setTimeout(() => {
                  router.push("/matches");
                }, 1500);
              } else {
                setMessage("Profile saved as draft!");
              }
            }
          } else {
            setMessage(
              publish
                ? "Profile published successfully!"
                : "Profile saved as draft!"
            );
          }
        } catch (embeddingError) {
          const errorMsg =
            embeddingError instanceof Error
              ? embeddingError.message
              : String(embeddingError);
          setMessage(
            publish
              ? `Profile published! Embedding error: ${errorMsg}`
              : `Profile saved! Embedding error: ${errorMsg}`
          );
        }
      }
    } catch (error) {
      setMessage("An unexpected error occurred");
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="font-mono text-gray-600">loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 bg-white">
        <nav className="flex items-center justify-between max-w-4xl mx-auto">
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
              matches
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

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2">
              profile setup
            </h1>
            <p className="font-mono text-gray-600 text-sm">
              describe yourself and what you want to build. this helps the
              semantic matching algorithm find compatible co-founders.
            </p>
          </div>

          <div className="space-y-8">
            {/* Personal Information */}
            <section className="bg-white p-6 rounded border border-gray-200">
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
                01. personal info
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-mono text-sm text-gray-700 mb-2">
                    name *
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block font-mono text-sm text-gray-700 mb-2">
                    region
                  </label>
                  <input
                    type="text"
                    value={profileData.region}
                    onChange={(e) =>
                      handleInputChange("region", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g., san francisco, remote, europe"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  bio
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="brief background about yourself, your experience, skills..."
                />
              </div>

              <div className="mt-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  achievements & experience
                </label>
                <textarea
                  value={profileData.achievements}
                  onChange={(e) =>
                    handleInputChange("achievements", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="previous companies, projects, notable achievements, technical skills..."
                />
              </div>
            </section>

            {/* Venture Ideas */}
            <section className="bg-white p-6 rounded border border-gray-200">
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
                02. venture / project ideas
              </h2>
              <p className="font-mono text-sm text-gray-600 mb-6">
                describe what you want to build. be specific about the problem,
                solution, and vision.
              </p>

              <div className="mb-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  project title *
                </label>
                <input
                  type="text"
                  value={profileData.venture_title}
                  onChange={(e) =>
                    handleInputChange("venture_title", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., AI-powered code review platform, sustainable food delivery network..."
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  detailed description *
                </label>
                <textarea
                  value={profileData.venture_description}
                  onChange={(e) =>
                    handleInputChange("venture_description", e.target.value)
                  }
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="explain the problem you're solving, your proposed solution, target market, technical approach, business model, vision for the future..."
                  required
                />
                <p className="text-xs font-mono text-gray-500 mt-1">
                  this description is used for semantic matching. be detailed
                  and specific.
                </p>
              </div>
            </section>

            {/* Co-founder Preferences */}
            <section className="bg-white p-6 rounded border border-gray-200">
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
                03. co-founder preferences
              </h2>
              <p className="font-mono text-sm text-gray-600 mb-6">
                describe what kind of co-founder you're looking for and what you
                bring to the table.
              </p>

              <div className="mb-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  preferences title
                </label>
                <input
                  type="text"
                  value={profileData.cofounder_preferences_title}
                  onChange={(e) =>
                    handleInputChange(
                      "cofounder_preferences_title",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., seeking technical co-founder, looking for business-minded partner..."
                />
              </div>

              <div>
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  detailed preferences
                </label>
                <textarea
                  value={profileData.cofounder_preferences_description}
                  onChange={(e) =>
                    handleInputChange(
                      "cofounder_preferences_description",
                      e.target.value
                    )
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="describe ideal co-founder skills, experience, work style, equity expectations, time commitment, complementary skills to yours..."
                />
              </div>
            </section>
          </div>

          {/* Save Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => saveProfile(false)}
              disabled={isSaving}
              className="px-6 py-3 border border-gray-300 rounded font-mono text-sm hover:bg-gray-50 transition duration-200 disabled:opacity-50"
            >
              {isSaving ? "saving..." : "save draft"}
            </button>

            <button
              onClick={() => saveProfile(true)}
              disabled={
                isSaving ||
                !profileData.name ||
                !profileData.venture_title ||
                !profileData.venture_description
              }
              className="px-6 py-3 bg-black text-white rounded font-mono text-sm hover:bg-gray-800 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "publishing..." : "save & publish"}
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 p-3 rounded text-sm font-mono ${
                message.includes("Error")
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-green-50 text-green-600 border border-green-200"
              }`}
            >
              {message}
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-100 rounded border-l-4 border-blue-600">
            <p className="text-sm font-mono text-gray-700">
              <strong>tip:</strong> the more detailed and specific your
              descriptions, the better the semantic matching algorithm can find
              compatible co-founders. focus on technical details, problem
              domains, and specific goals.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
