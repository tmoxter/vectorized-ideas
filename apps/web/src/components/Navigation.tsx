"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import { Search, Sparkles, SkipForward, ShieldOff, Settings, LogOut, Menu, User } from "lucide-react";

interface NavigationProps {
  currentPage: "discover" | "my-matches" | "skipped" | "blocked" | "profile" | "settings";
  userEmail?: string;
  onLogout: () => void;
}

export default function Navigation({ currentPage, userEmail, onLogout }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const navigate = (path: string) => {
    setIsMenuOpen(false);
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

  const getPageTitle = () => {
    switch (currentPage) {
      case "discover":
        return "discover";
      case "my-matches":
        return "my matches";
      case "skipped":
        return "skipped profiles";
      case "blocked":
        return "blocked profiles";
      case "profile":
        return "profile";
      default:
        return "";
    }
  };

  return (
    <header className="px-6 py-4 border-b border-gray-200 bg-white">
      <nav className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (isAuthenticated) {
                window.location.href = "/matches";
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
        </div>

        {/* Right - User Info, Menu & Logout */}
        <div className="flex items-center space-x-4">
          {userEmail && (
            <span className="font-mono text-sm text-gray-600 hidden md:inline">{userEmail}</span>
          )}

          {/* Hamburger Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded transition duration-200"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                {/* User Info on mobile */}
                {userEmail && (
                  <div className="md:hidden px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <span className="font-mono text-xs text-gray-600">{userEmail}</span>
                  </div>
                )}

                {/* Discover Section */}
                <div className="p-2">
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

                {/* Divider */}
                <div className="border-t border-gray-100 my-1"></div>

                {/* Past Interactions Section */}
                <div className="p-2">
                  <div className="px-4 py-2 text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider">
                    history
                  </div>
                  <button
                    onClick={() => navigate("/my-matches")}
                    className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                      currentPage === "my-matches"
                        ? "bg-yellow-200 text-gray-900 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>My Matches</span>
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

                {/* Divider */}
                <div className="border-t border-gray-100 my-1"></div>

                {/* Profile & Settings Section */}
                <div className="p-2">
                  <div className="px-4 py-2 text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider">
                    account
                  </div>
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
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 my-1"></div>

                {/* Logout */}
                <div className="p-2">
                  <button
                    onClick={onLogout}
                    className="w-full text-left px-4 py-3 rounded-md font-mono text-sm text-red-600 hover:bg-red-50 transition duration-200 flex items-center space-x-3"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
