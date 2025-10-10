"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface MatchCandidate {
  id: string;
  stage: string;
  timezone: string;
  availability_hours: string;
  similarity_score?: number;
  profile?: {
    name: string;
    bio: string;
    achievements: string;
    region: string;
  };
  venture?: {
    title: string;
    description: string;
  };
  preferences?: {
    title: string;
    description: string;
  };
}

type MatchAction = "interested" | "not_interested" | "maybe";

export default function MatchesPage() {
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [userActions, setUserActions] = useState<Record<string, MatchAction>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const response = await fetch(`/api/embeddings?userId=${userId}&limit=20`);

      if (!response.ok) {
        const errorData = await response.json();
        setMessage(
          `Error loading matches: ${errorData?.error || "Unknown error"}`
        );
        return;
      }

      const result = await response.json();
      const matchCandidates = result?.items || [];

      console.log("Match candidates received:", matchCandidates);
      console.log("Number of candidates:", matchCandidates.length);

      // Handle empty candidate set
      if (!matchCandidates || matchCandidates.length === 0) {
        console.log("No candidates found");
        setCandidates([]);
        setMessage(
          "No potential matches found. Make sure you have published your profile and there are other users with similar ventures."
        );
        return;
      }

      // Candidates are already enriched with profile, venture, and preferences data from the API
      setCandidates(matchCandidates);
    } catch (error) {
      setMessage("Failed to load matches");
      console.error("Error loading matches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const recordInteraction = async (
    targetUserId: string,
    action: "like" | "pass" | "block"
  ): Promise<boolean> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return false;

      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetUserId,
          action,
        }),
      });

      if (!response.ok) {
        console.error("Error recording interaction:", await response.json());
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error recording interaction:", error);
      return false;
    }
  };

  const handleAction = async (candidateId: string, action: MatchAction) => {
    if (!user) return;

    setIsSubmitting(true);
    setUserActions((prev) => ({ ...prev, [candidateId]: action }));

    try {
      // Map UI actions to database interaction types
      let interactionAction: "like" | "pass" | "block";
      if (action === "interested") {
        interactionAction = "like";
      } else if (action === "not_interested") {
        interactionAction = "pass";
      } else {
        // "maybe" maps to pass as well
        interactionAction = "pass";
      }

      // Record the interaction (API will auto-create match if reciprocal like exists)
      const interactionRecorded = await recordInteraction(
        candidateId,
        interactionAction
      );

      if (!interactionRecorded) {
        setMessage("There was an issue recording your interaction.");
      } else if (action === "interested") {
        setMessage(
          "Like recorded! If they like you back, you'll be matched automatically."
        );
      }

      // Move to next candidate after a short delay
      setTimeout(() => {
        if (currentIndex < candidates.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setMessage("You've reviewed all available matches!");
        }
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      console.error("Error handling action:", error);
      setMessage("There was an error processing your action.");
      setIsSubmitting(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="font-mono text-gray-600">
          loading potential matches...
        </div>
      </div>
    );
  }

  const currentCandidate = candidates[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 bg-white">
        <nav className="flex items-center justify-between max-w-6xl mx-auto">
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
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2">
              potential co-founders
            </h1>
            <div className="flex items-center justify-between">
              <p className="font-mono text-gray-600 text-sm">
                semantic similarity matches based on your profile and venture
                ideas
              </p>
              <div className="font-mono text-sm text-gray-500">
                {candidates.length > 0
                  ? `${currentIndex + 1} / ${candidates.length}`
                  : "0 / 0"}
              </div>
            </div>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono text-sm">
              {message}
            </div>
          )}

          {candidates.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-2">
                no matches found
              </h2>
              <p className="font-mono text-gray-600 text-sm mb-6">
                make sure you've completed your profile and published it to
                enable matching
              </p>
              <button
                onClick={() => router.push("/profile")}
                className="px-6 py-3 bg-black text-white rounded font-mono hover:bg-gray-800 transition duration-200"
              >
                complete profile
              </button>
            </div>
          ) : currentCandidate ? (
            <>
              {/* Navigation */}
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 border border-gray-300 rounded font-mono text-sm hover:bg-gray-50 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← previous
                </button>

                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                </div>

                <button
                  onClick={goToNext}
                  disabled={currentIndex === candidates.length - 1}
                  className="px-4 py-2 border border-gray-300 rounded font-mono text-sm hover:bg-gray-50 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  next →
                </button>
              </div>

              {/* Candidate Profile */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Profile Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-mono font-bold text-gray-900 mb-2">
                        {currentCandidate.profile?.name || "Anonymous"}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm font-mono text-gray-600">
                        {currentCandidate.profile?.region && (
                          <span>📍 {currentCandidate.profile.region}</span>
                        )}
                        {currentCandidate.timezone && (
                          <span>🕒 {currentCandidate.timezone}</span>
                        )}
                        {currentCandidate.stage && (
                          <span>🚀 {currentCandidate.stage}</span>
                        )}
                      </div>
                    </div>
                    {currentCandidate.similarity_score && (
                      <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-green-600">
                          {Math.round(currentCandidate.similarity_score * 100)}%
                        </div>
                        <div className="text-xs font-mono text-gray-500">
                          similarity match
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Content */}
                <div className="p-6 space-y-8">
                  {/* Bio Section */}
                  {currentCandidate.profile?.bio && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        about
                      </h3>
                      <p className="font-mono text-sm text-gray-700 leading-relaxed">
                        {currentCandidate.profile.bio}
                      </p>
                    </section>
                  )}

                  {/* Achievements Section */}
                  {currentCandidate.profile?.achievements && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        experience & achievements
                      </h3>
                      <p className="font-mono text-sm text-gray-700 leading-relaxed">
                        {currentCandidate.profile.achievements}
                      </p>
                    </section>
                  )}

                  {/* Venture Section */}
                  {currentCandidate.venture?.title && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        venture idea
                      </h3>
                      <h4 className="font-mono font-semibold text-gray-800 mb-2">
                        {currentCandidate.venture.title}
                      </h4>
                      {currentCandidate.venture.description && (
                        <p className="font-mono text-sm text-gray-700 leading-relaxed">
                          {currentCandidate.venture.description}
                        </p>
                      )}
                    </section>
                  )}

                  {/* Co-founder Preferences */}
                  {currentCandidate.preferences?.title && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        looking for
                      </h3>
                      <h4 className="font-mono font-semibold text-gray-800 mb-2">
                        {currentCandidate.preferences.title}
                      </h4>
                      {currentCandidate.preferences.description && (
                        <p className="font-mono text-sm text-gray-700 leading-relaxed">
                          {currentCandidate.preferences.description}
                        </p>
                      )}
                    </section>
                  )}

                  {/* Availability */}
                  {currentCandidate.availability_hours && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        availability
                      </h3>
                      <p className="font-mono text-sm text-gray-700">
                        {currentCandidate.availability_hours}
                      </p>
                    </section>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() =>
                        handleAction(currentCandidate.id, "not_interested")
                      }
                      disabled={isSubmitting}
                      className="px-6 py-3 border border-gray-300 rounded font-mono text-sm hover:bg-gray-100 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      pass
                    </button>
                    <button
                      onClick={() => handleAction(currentCandidate.id, "maybe")}
                      disabled={isSubmitting}
                      className="px-6 py-3 border border-yellow-300 bg-yellow-50 text-yellow-700 rounded font-mono text-sm hover:bg-yellow-100 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      maybe later
                    </button>
                    <button
                      onClick={() =>
                        handleAction(currentCandidate.id, "interested")
                      }
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-black text-white rounded font-mono text-sm hover:bg-gray-800 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "saving..." : "interested"}
                    </button>
                  </div>

                  {userActions[currentCandidate.id] && (
                    <div className="mt-4 text-center">
                      <span className="font-mono text-sm text-gray-600">
                        marked as:{" "}
                        {userActions[currentCandidate.id].replace("_", " ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
