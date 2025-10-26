"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Circles } from 'react-loader-spinner';
import {
  embedProfile,
  embedIdea,
  createProfileEmbeddingText,
  createVentureEmbeddingText,
} from "@/lib/embeddings-client";
import { CityPicker } from "./city_selection";

interface ProfileData {
  name: string;
  bio: string;
  achievements: string;
  experience: string;
  education: string;
  city_id: number | null;
  venture_title: string;
  venture_description: string;
  cofounder_preferences_title: string;
  cofounder_preferences_description: string;
}

type City = {
  id: number; name: string; admin1?: string | null; country: string; iso2: string;
  label: string;
  population: number | null;
};

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    bio: "",
    achievements: "",
    experience: "",
    education: "",
    city_id: null,
    venture_title: "",
    venture_description: "",
    cofounder_preferences_title: "",
    cofounder_preferences_description: "",
  });

  const [city, setCity] = useState<City | null>(null);
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

      const cityId = profileResult.data?.city_id;

      // Load city data if available
      if (cityId) {
        const { data: cityData } = await supabase
          .from("cities")
          .select("*")
          .eq("id", cityId)
          .single();

        if (cityData) {
          setCity({
            id: cityData.id,
            name: cityData.name,
            admin1: cityData.admin1,
            country: cityData.country_name,
            iso2: cityData.iso2,
            label: `${cityData.name}${cityData.admin1 ? `, ${cityData.admin1}` : ""} (${cityData.country_name})`,
            population: cityData.population,
          });
        }
      }

      setProfileData({
        name: profileResult.data?.name || "",
        bio: profileResult.data?.bio || "",
        achievements: profileResult.data?.achievements || "",
        experience: profileResult.data?.experience || "",
        education: profileResult.data?.education || "",
        city_id: cityId || null,
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

  const handleCityChange = (selectedCity: City | null) => {
    setCity(selectedCity);
    setProfileData((prev) => ({
      ...prev,
      city_id: selectedCity?.id || null,
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
        experience: profileData.experience,
        education: profileData.education,
        city_id: city?.id || null,
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
        // Generate embeddings only when publishing
        if (publish) {
          try {
            const embeddingPromises = [];

          // Generate profile embedding if profile data exists
          if (
            profileData.name ||
            profileData.bio ||
            profileData.achievements ||
            city
          ) {
            const profileText = createProfileEmbeddingText({
              name: profileData.name,
              bio: profileData.bio,
              achievements: profileData.achievements,
              region: city?.label || "",
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
              `Profile published! Embedding error: ${errorMsg}`
            );
          }
        } else {
          // Draft save - no embeddings generated
          setMessage("Profile saved as draft!");
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
        <Circles color="#111827" width="24" height="24" visible={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-breathe pb-10">
      <Navigation
        currentPage="profile"
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2">
              <span className="highlight-brush">Profile Setup</span>
            </h1>
            <p className="font-mono text-gray-600 text-sm">
              Describe yourself and what you want to build. This helps the
              semantic matching algorithm find compatible co-founders.
            </p>
          </div>

          <div className="space-y-8">
            {/* Personal Information */}
            <section className="bg-white p-6 rounded border border-gray-200">
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
                01. Personal Info
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-mono text-sm text-gray-700 mb-2">
                    Name *
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
                    City
                  </label>
                  <CityPicker
                    defaultCity={city}
                    onChange={handleCityChange}
                    required={false}
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Bio
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
                  Personal Achievement
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

              <div className="mt-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Experience
                </label>
                <textarea
                  value={profileData.experience}
                  onChange={(e) =>
                    handleInputChange("experience", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="work experience, roles, companies..."
                />
              </div>

              <div className="mt-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Education
                </label>
                <textarea
                  value={profileData.education}
                  onChange={(e) =>
                    handleInputChange("education", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="degrees, schools, certifications..."
                />
              </div>
            </section>

            {/* Venture Ideas */}
            <section className="bg-white p-6 rounded border border-gray-200">
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
                02.Venture / Project Ideas
              </h2>
              <p className="font-mono text-sm text-gray-600 mb-6">
                Describe what you want to build. Be specific about the problem,
                solution, and vision.
              </p>

              <div className="mb-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Project Tagline *
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
                  Description *
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
                  This description is used for semantic matching. Be detailed
                  and specific.
                </p>
              </div>
            </section>

            {/* Co-founder Preferences */}
            <section className="bg-white p-6 rounded border border-gray-200">
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
                03. Co-founder Preferences
              </h2>
              <p className="font-mono text-sm text-gray-600 mb-6">
                Describe what kind of co-founder you're looking for and what you
                bring to the table.
              </p>

              <div className="mb-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Role Title
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
                  Description
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
              className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-gray-900 bg-white border border-gray-300 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_4px_10px_rgba(2,6,23,0.06)] transition-transform duration-150 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(2,6,23,0.08)] active:translate-y-0 active:shadow-[0_3px_8px_rgba(2,6,23,0.06)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.6),rgba(255,255,255,0)_42%)]"
            >
              {isSaving ? "saving..." : "Save as draft"}
            </button>

            <button
              onClick={() => saveProfile(true)}
              disabled={
                isSaving ||
                !profileData.name ||
                !profileData.venture_title ||
                !profileData.venture_description
              }
              className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-white bg-gray-900 border border-gray-900 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-transform duration-150 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(0,0,0,0.30)] active:translate-y-0 active:shadow-[0_6px_14px_rgba(0,0,0,0.22)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.35),rgba(255,255,255,0)_38%)] after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:opacity-0 group-hover:after:opacity-100 after:transition-opacity after:duration-300 after:bg-[radial-gradient(120%_60%_at_50%_-20%,rgba(255,255,255,0.25),rgba(255,255,255,0))]"
            >
              {isSaving ? "publishing..." : "Save & publish"}
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

      <Footer />
    </div>
  );
}
