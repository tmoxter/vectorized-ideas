"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { Search, Sparkles, User, Settings, BarChart3, SkipForward, BookOpenText, Clock } from "lucide-react";
import { Circles } from 'react-loader-spinner';
import Image from "next/image";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = supabaseClient();

  useEffect(() => {
    checkAuth();
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
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Circles color="#111827" width="24" height="24" visible={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-white">
      <Navigation
        currentPage="home"
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2">
            </h1>
          </div>

          {/* Ticker Banner */}
          <div className="mb-8 overflow-hidden">
            <div className="ticker-animate flex gap-16 whitespace-nowrap">
              <p className="font-mono text-2xl font-semibold text-gray-800">
                Currently, there are 734 profiles matching your location filter. 19 are working on related topics.
                </p>
              <p className="font-mono text-2xl font-semibold text-gray-800">
                  Currently, there are 734 profiles matching your location filter. 19 are working on related topics.
                </p>
            </div>
          </div>

          {/* Navigation Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Discover Profiles */}
            <button
              onClick={() => router.push("/matches")}
              className="p-6 bg-white rounded border border-gray-200 text-left hover:border-gray-300 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded flex items-center justify-center mb-4 bg-gradient-to-br from-violet-100 via-blue-200 to-rose-100 group-hover:scale-110 transition-transform duration-200">
                <Search className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                Discover Profiles
              </h3>
              <p className="text-gray-600 text-sm font-mono">
                browse through semantic similarity matches and find potential co-founders based on your profile and venture ideas
              </p>
            </button>

            {/* Pending Requests */}
            <button
              onClick={() => router.push("/pending-requests")}
              className="p-6 bg-white rounded border border-gray-200 text-left hover:border-gray-300 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded flex items-center justify-center mb-4 icon-gradient group-hover:scale-110 transition-transform duration-200">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                Pending Requests
              </h3>
              <p className="text-gray-600 text-sm font-mono">
                review and respond to people who have liked your profile and want to connect
              </p>
            </button>

            {/* Revisit Skipped Profiles */}
            <button
              onClick={() => router.push("/skipped")}
              className="p-6 bg-white rounded border border-gray-200 text-left hover:border-gray-300 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded flex items-center justify-center mb-4 bg-gradient-to-br from-violet-100 via-blue-200 to-rose-100 group-hover:scale-110 transition-transform duration-200">
                <SkipForward className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                Revisit Skipped Profiles
              </h3>
              <p className="text-gray-600 text-sm font-mono">
                review profiles you previously passed on and reconsider potential connections
              </p>
            </button>

            {/* Matches */}
            <button
              onClick={() => router.push("/my-matches")}
              className="p-6 bg-white rounded border border-gray-200 text-left hover:border-gray-300 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded flex items-center justify-center mb-4 bg-gradient-to-br from-violet-100 via-blue-200 to-rose-100 group-hover:scale-110 transition-transform duration-200">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                Matches
              </h3>
              <p className="text-gray-600 text-sm font-mono">
                view your mutual matches and connect with co-founders who are interested in collaborating
              </p>
            </button>

            {/* My Profile */}
            <button
              onClick={() => router.push("/profile")}
              className="p-6 bg-white rounded border border-gray-200 text-left hover:border-gray-300 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded flex items-center justify-center mb-4 bg-gradient-to-br from-violet-100 via-blue-200 to-rose-100 group-hover:scale-110 transition-transform duration-200">
                <User className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                My Profile
              </h3>
              <p className="text-gray-600 text-sm font-mono">
                edit your profile, venture ideas, and co-founder preferences to improve matching
              </p>
            </button>

            {/* Settings */}
            <button
              onClick={() => router.push("/settings")}
              className="p-6 bg-white rounded border border-gray-200 text-left hover:border-gray-300 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded flex items-center justify-center mb-4 bg-gradient-to-br from-violet-100 via-blue-200 to-rose-100 group-hover:scale-110 transition-transform duration-200">
                <Settings className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                Settings
              </h3>
              <p className="text-gray-600 text-sm font-mono">
                manage your account settings, preferences, and blocked profiles
              </p>
            </button>

            {/* Analyze */}
            <button
              onClick={() => router.push("/analyze")}
              className="p-6 bg-white rounded border border-gray-200 text-left hover:border-gray-300 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded flex items-center justify-center mb-4 bg-gradient-to-br from-violet-100 via-blue-200 to-rose-100 group-hover:scale-110 transition-transform duration-200">
                <BarChart3 className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                Analyze
              </h3>
              <p className="text-gray-600 text-sm font-mono">
                view insights and analytics about your matching activity and profile performance
              </p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
