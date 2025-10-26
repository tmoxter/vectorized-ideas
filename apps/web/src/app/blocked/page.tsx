"use client";

import { useState } from "react";
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
  const { profiles, isLoading: profilesLoading, error, reload } = useBlockedProfiles(user?.id);
  const { recordInteraction, isSubmitting } = useInteraction();

  const [selectedProfile, setSelectedProfile] = useState(profiles[0] || null);
  const [message, setMessage] = useState("");

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

      <main className="px-6 py-8">
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
              onSelectProfile={setSelectedProfile}
            >
              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={handleUnblock}
                  disabled={isSubmitting}
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
