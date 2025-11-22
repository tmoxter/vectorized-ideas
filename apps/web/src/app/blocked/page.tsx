"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHeader } from "@/components/PageHeader";
import { MessageBanner } from "@/components/MessageBanner";
import { EmptyState } from "@/components/EmptyState";
import { ProfileListLayout } from "@/components/ProfileListLayout";
import { useAuth } from "@/hooks/useAuth";
import { useBlockedProfiles } from "@/hooks/useBlockedProfiles";
import { useInteraction } from "@/hooks/useInteraction";
import { ShieldOff } from "lucide-react";

export default function BlockedProfilesPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const {
    profiles,
    isLoading: profilesLoading,
    error,
    reload,
  } = useBlockedProfiles(user?.id);
  const { recordInteraction, isSubmitting } = useInteraction();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId]
  );

  useEffect(() => {
    if (profilesLoading) return;
    if (selectedId && profiles.some((p) => p.id === selectedId)) return; // keep current
    setSelectedId(profiles.length ? profiles[0].id : null);
  }, [profiles, profilesLoading, selectedId]);

  const handleUnblock = async () => {
    if (!selectedProfile) return;

    const success = await recordInteraction(selectedProfile.id, "unblock");
    if (!success) {
      setMessage("Failed to unblock user");
      return;
    }
    setMessage("User unblocked successfully");
    await reload();
  };

  if (isLoading || profilesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-breathe pb-10">
      <Navigation
        currentPage="blocked"
        userEmail={user?.email}
        onLogout={logout}
      />

      <main className="px-6 pt-24 pb-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader title="Blocked Profiles" />

          {message && <MessageBanner message={message} />}
          {error && <MessageBanner message={error} type="error" />}

          {profiles.length === 0 ? (
            <EmptyState
              Icon={ShieldOff}
              title="no blocked profiles"
              description="Users you block will appear here"
              actionText="Discover co-founders"
              onAction={() => router.push("/matches")}
            />
          ) : (
            <ProfileListLayout
              profiles={profiles}
              selectedProfile={selectedProfile}
              onSelectProfile={(p) => setSelectedId(p.id)}
            >
              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={handleUnblock}
                  disabled={isSubmitting || !selectedProfile}
                  className="px-6 py-3 bg-black text-white rounded font-mono text-sm hover:bg-gray-800 transition duration-200 disabled:opacity-50"
                >
                  {isSubmitting ? "unblocking..." : "unblock user"}
                </button>
              </div>
            </ProfileListLayout>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
