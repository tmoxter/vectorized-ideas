"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Clock, ShieldX } from "lucide-react";
import { Circles } from "react-loader-spinner";

interface PendingRequest {
  id: string;
  stage: string;
  timezone: string;
  availability_hours: string;
  created_at: string;
  profile?: {
    name: string;
    bio: string;
    achievements: string;
    experience: string;
    education: string;
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

export default function PendingRequestsPage() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const router = useRouter();
  const supabase = supabaseClient();

  useEffect(() => {
    checkAuthAndLoadRequests();
  }, []);

  const checkAuthAndLoadRequests = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/");
      return;
    }
    setUser(session.user);
    await loadPendingRequests(session.user.id, session.access_token);
  };

  const loadPendingRequests = async (userId: string, token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pending-requests?limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setMessage(
          `Error loading pending requests: ${errorData?.error || "Unknown error"}`
        );
        setRequests([]);
        setCurrentIndex(0);
        return;
      }

      const result = await response.json();
      const pendingRequests = result?.items || [];
      console.log(
        "[pending-requests] Number of requests:",
        pendingRequests.length
      );

      if (!pendingRequests || pendingRequests.length === 0) {
        console.log("No pending requests found");
        setRequests([]);
        return;
      }

      setRequests(pendingRequests);
    } catch (error) {
      setMessage("Failed to load pending requests");
      console.error("Error loading pending requests:", error);
      setRequests([]);
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
    if (currentIndex < requests.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setMessage("You've reviewed all pending requests!");
    }
  };

  const handleAction = async (requestId: string, action: MatchAction) => {
    if (!user) return;

    setIsSubmitting(true);

    try {
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

      const interactionRecorded = await recordInteraction(
        requestId,
        interactionAction
      );

      if (!interactionRecorded) {
        setMessage("There was an issue recording your interaction.");
        setIsSubmitting(false);
      } else {
        if (action === "like") {
          setMessage("Match created! You can now connect with this person.");
        }
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

  const handleBlock = async (requestId: string) => {
    if (!user) return;

    setIsSubmitting(true);
    setShowBlockConfirm(false);

    try {
      const interactionRecorded = await recordInteraction(requestId, "block");

      if (!interactionRecorded) {
        setMessage("There was an issue blocking this user.");
        setIsSubmitting(false);
      } else {
        setMessage("User blocked successfully.");
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

  const currentRequest = requests[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-breathe pb-10">
      <Navigation
        currentPage="pending-requests"
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2">
              <span className="highlight-brush">Pending Requests</span>
            </h1>
            <p className="font-mono text-gray-600 text-sm">
              people who liked your profile and are waiting for your response
            </p>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 text-blue-700 border border-yellow-200 rounded font-mono text-sm">
              {message}
            </div>
          )}

          {requests.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-6">
                <Clock className="w-24 h-24 text-gray-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-2">
                no pending requests
              </h2>
              <p className="font-mono text-gray-600 text-sm mb-6">
                when someone likes your profile, they'll appear here
              </p>
              <button
                onClick={() => router.push("/matches")}
                className="px-6 py-3 bg-black text-white rounded font-mono hover:bg-gray-800 transition duration-200"
              >
                discover profiles
              </button>
            </div>
          ) : currentRequest ? (
            <>
              {/* Request Profile */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Profile Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-mono font-bold text-gray-900 mb-2">
                        {currentRequest.profile?.name || "Anonymous"}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm font-mono text-gray-600">
                        {currentRequest.profile?.city_name &&
                          currentRequest.profile?.country && (
                            <span>
                              📍 {currentRequest.profile.city_name},{" "}
                              {currentRequest.profile.country}
                            </span>
                          )}
                        {currentRequest.timezone && (
                          <span>🕒 {currentRequest.timezone}</span>
                        )}
                        {currentRequest.stage && (
                          <span>🚀 {currentRequest.stage}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-gray-500">
                        request received
                      </div>
                      <div className="text-sm font-mono text-gray-700">
                        {new Date(
                          currentRequest.created_at
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Content */}
                <div className="p-6 space-y-8">
                  {/* Bio Section */}
                  {currentRequest.profile?.bio && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        Bio
                      </h3>
                      <p className="font-mono text-sm text-gray-700 leading-relaxed">
                        {currentRequest.profile.bio}
                      </p>
                    </section>
                  )}

                  {/* Achievements Section */}
                  {currentRequest.profile?.achievements && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        Past Achievement
                      </h3>
                      <p className="font-mono text-sm text-gray-700 leading-relaxed">
                        {currentRequest.profile.achievements}
                      </p>
                    </section>
                  )}

                  {/* Experience Section */}
                  {currentRequest.profile?.experience && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        Experience
                      </h3>
                      <p className="font-mono text-sm text-gray-700 leading-relaxed">
                        {currentRequest.profile.experience}
                      </p>
                    </section>
                  )}

                  {/* Education Section */}
                  {currentRequest.profile?.education && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        Education
                      </h3>
                      <p className="font-mono text-sm text-gray-700 leading-relaxed">
                        {currentRequest.profile.education}
                      </p>
                    </section>
                  )}

                  {/* Venture Section */}
                  {currentRequest.venture?.title && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        Venture Idea
                      </h3>
                      <h4 className="font-mono font-semibold text-gray-800 mb-2">
                        {currentRequest.venture.title}
                      </h4>
                      {currentRequest.venture.description && (
                        <p className="font-mono text-sm text-gray-700 leading-relaxed">
                          {currentRequest.venture.description}
                        </p>
                      )}
                    </section>
                  )}

                  {/* Co-founder Preferences */}
                  {currentRequest.preferences?.title && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        looking for
                      </h3>
                      <h4 className="font-mono font-semibold text-gray-800 mb-2">
                        {currentRequest.preferences.title}
                      </h4>
                      {currentRequest.preferences.description && (
                        <p className="font-mono text-sm text-gray-700 leading-relaxed">
                          {currentRequest.preferences.description}
                        </p>
                      )}
                    </section>
                  )}

                  {/* Availability */}
                  {currentRequest.availability_hours && (
                    <section>
                      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
                        availability
                      </h3>
                      <p className="font-mono text-sm text-gray-700">
                        {currentRequest.availability_hours}
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
                          onClick={() =>
                            handleAction(currentRequest.id, "pass")
                          }
                          disabled={isSubmitting}
                          className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-gray-900 bg-white border border-gray-300 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_4px_10px_rgba(2,6,23,0.06)] transition-transform duration-150 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(2,6,23,0.08)] active:translate-y-0 active:shadow-[0_3px_8px_rgba(2,6,23,0.06)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.6),rgba(255,255,255,0)_42%)]"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() =>
                            handleAction(currentRequest.id, "like")
                          }
                          disabled={isSubmitting}
                          className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-white bg-gray-900 border border-gray-900 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-transform duration-150 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(0,0,0,0.30)] active:translate-y-0 active:shadow-[0_6px_14px_rgba(0,0,0,0.22)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.35),rgba(255,255,255,0)_38%)] after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:opacity-0 group-hover:after:opacity-100 after:transition-opacity after:duration-300 after:bg-[radial-gradient(120%_60%_at_50%_-20%,rgba(255,255,255,0.25),rgba(255,255,255,0))]"
                        >
                          {isSubmitting ? "saving..." : "Accept & Match"}
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
                          They won't appear in your requests again and you won't
                          see each other.
                        </p>
                      </div>
                      <div className="flex justify-center space-x-3">
                        <button
                          onClick={() => handleBlock(currentRequest.id)}
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

      <Footer />
    </div>
  );
}
