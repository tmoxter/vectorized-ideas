"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";

interface NavigationProps {
  currentPage: "discover" | "my-matches" | "skipped" | "blocked" | "profile";
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
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <span className="text-white font-mono text-sm">λ</span>
            </div>
            <span className="font-mono text-lg text-gray-900">
              vectorized-ideas
            </span>
          </button>
        </div>

        {/* Center - Menu Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded font-mono text-sm hover:bg-gray-50 transition duration-200"
          >
            <span className="text-gray-900">{getPageTitle()}</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                isMenuOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute top-full mt-2 left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              {/* Discover Section */}
              <div className="p-2 border-b border-gray-100">
                <button
                  onClick={() => navigate("/matches")}
                  className={`w-full text-left px-3 py-2 rounded font-mono text-sm transition duration-200 ${
                    currentPage === "discover"
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  🔍 discover co-founders
                </button>
              </div>

              {/* Past Interactions Section */}
              <div className="p-2 border-b border-gray-100">
                <div className="px-3 py-1 text-xs font-mono font-semibold text-gray-500 uppercase">
                  past interactions
                </div>
                <button
                  onClick={() => navigate("/my-matches")}
                  className={`w-full text-left px-3 py-2 rounded font-mono text-sm transition duration-200 ${
                    currentPage === "my-matches"
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  my matches
                </button>
                <button
                  onClick={() => navigate("/skipped")}
                  className={`w-full text-left px-3 py-2 rounded font-mono text-sm transition duration-200 ${
                    currentPage === "skipped"
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  skipped profiles
                </button>
                <button
                  onClick={() => navigate("/blocked")}
                  className={`w-full text-left px-3 py-2 rounded font-mono text-sm transition duration-200 ${
                    currentPage === "blocked"
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  blocked profiles
                </button>
              </div>

              {/* Profile Section */}
              <div className="p-2">
                <button
                  onClick={() => navigate("/profile")}
                  className={`w-full text-left px-3 py-2 rounded font-mono text-sm transition duration-200 ${
                    currentPage === "profile"
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  profile settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right - User Info & Logout */}
        <div className="flex items-center space-x-4">
          {userEmail && (
            <span className="font-mono text-sm text-gray-600">{userEmail}</span>
          )}
          <button
            onClick={onLogout}
            className="font-mono text-sm text-gray-600 hover:text-gray-900 transition duration-200"
          >
            logout
          </button>
        </div>
      </nav>
    </header>
  );
}
