"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHeader } from "@/components/PageHeader";
import { MessageBanner } from "@/components/MessageBanner";
import { EmptyState } from "@/components/EmptyState";
import { ProfileDetail } from "@/components/ProfileDetail";
import { ActionButtons } from "@/components/ActionButtons";
import { BlockButton, BlockConfirmation } from "@/components/BlockConfirmation";
import { useAuth } from "@/hooks/useAuth";
import { usePendingRequests } from "@/hooks/usePendingRequests";
import { useInteraction } from "@/hooks/useInteraction";
import { Clock } from "lucide-react";

export default function PendingRequestsPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { requests, isLoading: requestsLoading, error } = usePendingRequests();
  const { recordInteraction, isSubmitting } = useInteraction();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const currentRequest = requests[currentIndex];

  const goToNext = () => {
    if (currentIndex < requests.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowBlockConfirm(false);
    } else {
      setMessage("You've reviewed all pending requests!");
    }
  };

  const handleAction = async (action: "like" | "pass") => {
    if (!currentRequest) return;

    const success = await recordInteraction(currentRequest.id, action);

    if (!success) {
      setMessage("There was an issue recording your interaction.");
      return;
    }

    if (action === "like") {
      setMessage("Match created! You can now connect with this person.");
    }

    setTimeout(() => {
      goToNext();
      setMessage("");
    }, 800);
  };

  const handleBlock = async () => {
    if (!currentRequest) return;

    const success = await recordInteraction(currentRequest.id, "block");

    if (!success) {
      setMessage("There was an issue blocking this user.");
      setShowBlockConfirm(false);
      return;
    }

    setMessage("User blocked successfully.");
    setTimeout(() => {
      goToNext();
      setMessage("");
    }, 800);
  };

  if (isLoading || requestsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-breathe pb-10">
      <Navigation
        currentPage="pending-requests"
        userEmail={user?.email}
        onLogout={logout}
      />

      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Pending Requests"
            description="people who liked your profile and are waiting for your response"
            highlight
          />

          {message && <MessageBanner message={message} />}
          {error && <MessageBanner message={error} type="error" />}

          {requests.length === 0 ? (
            <EmptyState
              Icon={Clock}
              title="no pending requests"
              description="when someone likes your profile, they'll appear here"
              actionText="discover profiles"
              onAction={() => router.push("/matches")}
            />
          ) : currentRequest ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <ProfileDetail profile={currentRequest} />

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                {!showBlockConfirm ? (
                  <>
                    <ActionButtons
                      onLike={() => handleAction("like")}
                      onSkip={() => handleAction("pass")}
                      isSubmitting={isSubmitting}
                      likeText="Accept & Match"
                    />
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
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
