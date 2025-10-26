"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHeader } from "@/components/PageHeader";
import { MessageBanner } from "@/components/MessageBanner";
import { EmptyState } from "@/components/EmptyState";
import { ProfileListLayout } from "@/components/ProfileListLayout";
import { BlockButton, BlockConfirmation } from "@/components/BlockConfirmation";
import { useAuth } from "@/hooks/useAuth";
import { useSkippedProfiles } from "@/hooks/useSkippedProfiles";
import { useInteraction } from "@/hooks/useInteraction";
import { UserX } from "lucide-react";

export default function SkippedProfilesPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const {
    profiles,
    isLoading: profilesLoading,
    error,
    reload,
  } = useSkippedProfiles(user?.id);
  const { recordInteraction, isSubmitting } = useInteraction();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const selectedProfile = useMemo(
    () => profiles.find((m) => m.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  useEffect(() => {
    if (profilesLoading) return;

    if (selectedProfileId && profiles.some((m) => m.id === selectedProfileId)) {
      return; // still valid, keep it
    }
    if (profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    } else {
      setSelectedProfileId(null);
    }
  }, [profiles, profilesLoading, selectedProfileId]);

  // Hard gate rendering until user + matches ready (prevents hydration mismatch)
  if (isLoading || profilesLoading) {
    return <LoadingSpinner />;
  }

  const handleLike = async () => {
    if (!selectedProfile) return;

    const success = await recordInteraction(selectedProfile.id, "like");

    if (!success) {
      setMessage("Failed to like user");
      return;
    }

    setMessage(
      "User liked! They'll be moved to matches if they like you back."
    );
    await reload();
  };

  const handleBlock = async () => {
    if (!selectedProfile) return;

    const success = await recordInteraction(selectedProfile.id, "block");

    if (!success) {
      setMessage("Failed to block user");
      setShowBlockConfirm(false);
      return;
    }

    setMessage("User blocked successfully");
    setShowBlockConfirm(false);
    await reload();
  };

  if (isLoading || profilesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-breathe pb-10">
      <Navigation
        currentPage="skipped"
        userEmail={user?.email}
        onLogout={logout}
      />

      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader title="Skipped Profiles" highlight />

          {message && <MessageBanner message={message} />}
          {error && <MessageBanner message={error} type="error" />}

          {profiles.length === 0 ? (
            <EmptyState
              Icon={UserX}
              title="no skipped profiles"
              description="Profiles you pass on will appear here"
              actionText="Discover co-founders"
              onAction={() => router.push("/matches")}
            />
          ) : (
            <ProfileListLayout
              profiles={profiles}
              selectedProfile={selectedProfile}
              onSelectProfile={(m) => setSelectedProfileId(m.id)}
            >
              <div className="p-6 bg-gray-50 border-t border-gray-100">
                {!showBlockConfirm ? (
                  <>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={handleLike}
                        disabled={isSubmitting}
                        className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-white bg-gray-900 border border-gray-900 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-transform duration-150 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(0,0,0,0.30)] active:translate-y-0 active:shadow-[0_6px_14px_rgba(0,0,0,0.22)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.35),rgba(255,255,255,0)_38%)] after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:opacity-0 group-hover:after:opacity-100 after:transition-opacity after:duration-300 after:bg-[radial-gradient(120%_60%_at_50%_-20%,rgba(255,255,255,0.25),rgba(255,255,255,0))]"
                      >
                        {isSubmitting ? "saving..." : "Let's connect"}
                      </button>
                    </div>
                    <div className="mt-4 flex justify-center">
                      <BlockButton
                        onClick={() => setShowBlockConfirm(true)}
                        isSubmitting={isSubmitting}
                      />
                    </div>
                  </>
                ) : (
                  <BlockConfirmation
                    onConfirm={handleBlock}
                    onCancel={() => setShowBlockConfirm(false)}
                    isSubmitting={isSubmitting}
                  />
                )}
              </div>
            </ProfileListLayout>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
