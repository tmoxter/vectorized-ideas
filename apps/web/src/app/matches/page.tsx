"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { SearchX, ShieldX } from "lucide-react";
import { Circles } from 'react-loader-spinner'

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
    city_name?: string;
    country?: string;
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

type MatchAction = "like" | "pass";

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
      const response = await fetch(`/api/embeddings?userId=${userId}&limit=20`);

      if (!response.ok) {
        const errorData = await response.json();
        setMessage(
          `Error loading matches: ${errorData?.error || "Unknown error"}`
        );
        setCandidates([]);
        setCurrentIndex(0);
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
      setCandidates([]);
      setCurrentIndex(0);
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

  const goToNext = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setMessage("You've reviewed all available matches!");
    }
  };

  const handleAction = async (candidateId: string, action: MatchAction) => {
    if (!user) return;

    setIsSubmitting(true);
    setUserActions((prev) => ({ ...prev, [candidateId]: action }));

    try {
      // Map UI actions to database interaction types
      let interactionAction: "like" | "pass" | "block";
      if (action === "like") {
        interactionAction = "like";
      } else if (action === "pass") {
        interactionAction = "pass";
      } else {
        setMessage("Invalid action");
        setIsSubmitting(false);
        return;
      }

      // Record the interaction (API will auto-create match if reciprocal like exists)
      const interactionRecorded = await recordInteraction(
        candidateId,
        interactionAction
      );

      if (!interactionRecorded) {
        setMessage("There was an issue recording your interaction.");
        setIsSubmitting(false);
      } else {
        if (action === "like") {
          setMessage(
            "Like recorded! If they like you back, you'll be matched automatically."
          );
        }
        // Move to next candidate immediately
        setTimeout(() => {
          goToNext();
          setIsSubmitting(false);
        }, 800);
      }
    } catch (error) {
      console.error("Error handling action:", error);
      setMessage("There was an error processing your action.");
      setIsSubmitting(false);
    }
  };

  const handleBlock = async (candidateId: string) => {
    if (!user) return;

    setIsSubmitting(true);
    setShowBlockConfirm(false);

    try {
      const interactionRecorded = await recordInteraction(candidateId, "block");

      if (!interactionRecorded) {
        setMessage("There was an issue blocking this user.");
        setIsSubmitting(false);
      } else {
        setMessage("User blocked successfully.");
        // Move to next candidate immediately
        setTimeout(() => {
          goToNext();
          setIsSubmitting(false);
        }, 800);
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      setMessage("There was an error blocking this user.");
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

  const currentCandidate = candidates[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentPage="discover"
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2">
              <span className="highlight-brush">Discover Profiles</span>
            </h1>
            <p className="font-mono text-gray-600 text-sm">
              semantic similarity matches based on your profile and venture
              ideas
            </p>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono text-sm">
              {message}
            </div>
          )}

          {candidates.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-6">
                <SearchX className="w-24 h-24 text-gray-400" strokeWidth={1.5} />
              </div>
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
                        {currentCandidate.profile?.city_name && currentCandidate.profile?.country && (
                          <span>📍 {currentCandidate.profile.city_name}, {currentCandidate.profile.country}</span>
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
                        Bio
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
                        Past Achievement
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
                        Venture Idea
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
                  {!showBlockConfirm ? (
                    <>
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => handleAction(currentCandidate.id, "pass")}
                          disabled={isSubmitting}
                          className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-gray-900 bg-white border border-gray-300 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_4px_10px_rgba(2,6,23,0.06)] transition-transform duration-150 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(2,6,23,0.08)] active:translate-y-0 active:shadow-[0_3px_8px_rgba(2,6,23,0.06)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.6),rgba(255,255,255,0)_42%)]"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => handleAction(currentCandidate.id, "like")}
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
                          onClick={() => handleBlock(currentCandidate.id)}
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
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
