"use client";

import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { TickerBanner } from "@/components/TickerBanner";
import { NavigationCard } from "@/components/NavigationCard";
import { useAuth } from "@/hooks/useAuth";
import { useBannerCounts } from "@/hooks/useBannerCounts";
import {
  Search,
  Sparkles,
  User,
  Settings,
  BarChart3,
  SkipForward,
  Clock,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const bannerData = useBannerCounts();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-breathe pb-10">
      <Navigation
        currentPage="home"
        userEmail={user?.email}
        onLogout={logout}
      />

      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2"></h1>
          </div>

          <TickerBanner data={bannerData} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NavigationCard
              Icon={Search}
              title="Discover Profiles"
              description="browse through semantic similarity matches and find potential co-founders based on your profile and venture ideas"
              onClick={() => router.push("/matches")}
            />

            <NavigationCard
              Icon={Clock}
              title="Pending Requests"
              description="review and respond to people who have liked your profile and want to connect"
              onClick={() => router.push("/pending-requests")}
            />

            <NavigationCard
              Icon={SkipForward}
              title="Revisit Skipped Profiles"
              description="review profiles you previously passed on and reconsider potential connections"
              onClick={() => router.push("/skipped")}
            />

            <NavigationCard
              Icon={Sparkles}
              title="Matches"
              description="view your mutual matches and connect with co-founders who are interested in collaborating"
              onClick={() => router.push("/my-matches")}
            />

            <NavigationCard
              Icon={User}
              title="My Profile"
              description="edit your profile, venture ideas, and co-founder preferences to improve matching"
              onClick={() => router.push("/profile")}
            />

            <NavigationCard
              Icon={Settings}
              title="Settings"
              description="manage your account settings, preferences, and blocked profiles"
              onClick={() => router.push("/settings")}
            />

            <NavigationCard
              Icon={BarChart3}
              title="Analyze"
              description="view insights and analytics about your matching activity and profile performance"
              onClick={() => router.push("/analyze")}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
