"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import { Search, Sparkles, SkipForward, ShieldOff, Settings, LogOut, User, Home } from "lucide-react";

interface NavigationProps {
  currentPage: "home" | "discover" | "my-matches" | "skipped" | "blocked" | "profile" | "settings";
  userEmail?: string;
  onLogout: () => void;
}

export default function Navigation({ currentPage, userEmail, onLogout }: NavigationProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const navigate = (path: string) => {
    setActiveDropdown(null);
    router.push(path);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = supabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  return (
    <header className="px-6 py-4 border-b border-gray-200 bg-white">
      <nav className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center space-x-8">
          <button
            onClick={() => {
              if (isAuthenticated) {
                window.location.href = "/home";
              } else {
                window.location.href = "/";
              }
            }}
            className="flex items-center space-x-3 hover:opacity-80"
          >
            <div className="w-8 h-8 bg-yellow-200 rounded flex items-center justify-center">
              <span className="text-black font-mono text-2xl">{'\u{1D708}'}</span>
            </div>
            <span className="font-mono text-lg text-gray-900 hidden sm:inline">
              vectorized-ideas
            </span>
          </button>

          {/* Main Navigation Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Discover Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("discover")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={`px-4 py-2 font-mono text-sm transition duration-200 rounded-md ${
                  currentPage === "home" || currentPage === "discover"
                    ? "bg-yellow-200 text-gray-900 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Discover
              </button>

              {activeDropdown === "discover" && (
                <div className="absolute top-full pt-2 left-0 w-56 z-50">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-2">
                      <button
                        onClick={() => navigate("/home")}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "home"
                            ? "bg-yellow-200 text-gray-900 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Home className="w-4 h-4" />
                        <span>Dashboard</span>
                      </button>
                      <button
                        onClick={() => navigate("/matches")}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "discover"
                            ? "bg-yellow-200 text-gray-900 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Search className="w-4 h-4" />
                        <span>Discover Profiles</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* History Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("history")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={`px-4 py-2 font-mono text-sm transition duration-200 rounded-md ${
                  currentPage === "my-matches" || currentPage === "skipped"
                    ? "bg-yellow-200 text-gray-900 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                History
              </button>

              {activeDropdown === "history" && (
                <div className="absolute top-full pt-2 left-0 w-56 z-50">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-2">
                      <button
                        onClick={() => navigate("/my-matches")}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "my-matches"
                            ? "bg-yellow-200 text-gray-900 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Matches</span>
                      </button>
                      <button
                        onClick={() => navigate("/skipped")}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "skipped"
                            ? "bg-yellow-200 text-gray-900 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <SkipForward className="w-4 h-4" />
                        <span>Skipped Profiles</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Account Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("account")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={`px-4 py-2 font-mono text-sm transition duration-200 rounded-md ${
                  currentPage === "profile" || currentPage === "settings" || currentPage === "blocked"
                    ? "bg-yellow-200 text-gray-900 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Account
              </button>

              {activeDropdown === "account" && (
                <div className="absolute top-full pt-2 left-0 w-56 z-50">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-2">
                      <button
                        onClick={() => navigate("/profile")}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "profile"
                            ? "bg-yellow-200 text-gray-900 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => navigate("/settings")}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "settings"
                            ? "bg-yellow-200 text-gray-900 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Settings className="w-4 h-4" />
                        <span>Account Settings</span>
                      </button>
                      <button
                        onClick={() => navigate("/blocked")}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "blocked"
                            ? "bg-yellow-200 text-gray-900 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <ShieldOff className="w-4 h-4" />
                        <span>Blocked Profiles</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right - User Info & Logout */}
        <div className="flex items-center space-x-4">
          {userEmail && (
            <span className="font-mono text-sm text-gray-600 hidden lg:inline">{userEmail}</span>
          )}
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-md font-mono text-sm text-red-600 hover:bg-red-50 transition duration-200 flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
