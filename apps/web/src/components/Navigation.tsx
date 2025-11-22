"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import Image from "next/image";
import {
  Search,
  Sparkles,
  SkipForward,
  ShieldOff,
  Settings,
  LogOut,
  User,
  Home,
  ChevronDown,
  Clock,
} from "lucide-react";

interface NavigationProps {
  currentPage:
    | "home"
    | "discover"
    | "my-matches"
    | "skipped"
    | "blocked"
    | "profile"
    | "settings"
    | "pending-requests";
  userEmail?: string;
  onLogout: () => void;
}

export default function Navigation({
  currentPage,
  userEmail,
  onLogout,
}: NavigationProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b border-gray-300 transition-all duration-300 ${
        isScrolled ? 'px-6 py-2 shadow-md' : 'px-6 py-4'
      }`}
      style={{ backgroundColor: '#FFFFFB' }}
    >
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
            <Image
              src="/vi.svg"
              alt="vectorized-ideas logo"
              width={32}
              height={32}
            />
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
                className="px-4 py-2 font-mono text-sm transition duration-200 rounded-md flex items-center space-x-1 text-gray-700"
              >
                <span
                  className={currentPage === "home" || currentPage === "discover" ? "font-semibold" : ""}
                  style={currentPage === "home" || currentPage === "discover" ? {
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  } : {}}
                >
                  Discover
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    activeDropdown === "discover" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {activeDropdown === "discover" && (
                <div className="absolute top-full pt-2 left-0 w-86 z-70">
                  <div className="border border-gray-200 rounded-sm shadow-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFB' }}>
                    <div className="p-2">
                      <button
                        onClick={() => navigate("/home")}
                        onMouseEnter={() => setHoveredItem("home")}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`w-full text-left px-4 py-3 rounded-sm font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "home"
                            ? "text-gray-900 font-semibold"
                            : "text-gray-700 "
                        }`}
                      >
                        {hoveredItem === "home" && <Home className="w-4 h-4" />}
                        <span
                          className={currentPage === "home" ? "font-semibold" : ""}
                          style={currentPage === "home" ? {
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          } : {}}
                        >
                          Dashboard
                        </span>
                      </button>
                      <button
                        onClick={() => navigate("/matches")}
                        onMouseEnter={() => setHoveredItem("discover")}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "discover"
                            ? "text-gray-900 font-semibold"
                            : "text-gray-700 "
                        }`}
                      >
                        {hoveredItem === "discover" && (
                          <Search className="w-4 h-4" />
                        )}
                        <span
                          className={currentPage === "discover" ? "font-semibold" : ""}
                          style={currentPage === "discover" ? {
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          } : {}}
                        >
                          Discover Profiles
                        </span>
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
                className="px-4 py-2 font-mono text-sm transition duration-200 rounded-md flex items-center space-x-1 text-gray-700"
              >
                <span
                  className={currentPage === "my-matches" || currentPage === "skipped" || currentPage === "pending-requests" ? "font-semibold" : ""}
                  style={currentPage === "my-matches" || currentPage === "skipped" || currentPage === "pending-requests" ? {
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  } : {}}
                >
                  History
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    activeDropdown === "history" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {activeDropdown === "history" && (
                <div className="absolute top-full pt-2 left-0 w-86 z-60">
                  <div className="border border-gray-200 rounded-sm shadow-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFB' }}>
                    <div className="p-2">
                      <button
                        onClick={() => navigate("/pending-requests")}
                        onMouseEnter={() => setHoveredItem("pending-requests")}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "pending-requests"
                            ? "text-gray-900 font-semibold"
                            : "text-gray-700 "
                        }`}
                      >
                        {hoveredItem === "pending-requests" && (
                          <Clock className="w-4 h-4" />
                        )}
                        <span
                          className={currentPage === "pending-requests" ? "font-semibold" : ""}
                          style={currentPage === "pending-requests" ? {
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          } : {}}
                        >
                          Pending Requests
                        </span>
                      </button>
                      <button
                        onClick={() => navigate("/my-matches")}
                        onMouseEnter={() => setHoveredItem("my-matches")}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "my-matches"
                            ? "text-gray-900 font-semibold"
                            : "text-gray-700 "
                        }`}
                      >
                        {hoveredItem === "my-matches" && (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span
                          className={currentPage === "my-matches" ? "font-semibold" : ""}
                          style={currentPage === "my-matches" ? {
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          } : {}}
                        >
                          Matches
                        </span>
                      </button>
                      <button
                        onClick={() => navigate("/skipped")}
                        onMouseEnter={() => setHoveredItem("skipped")}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "skipped"
                            ? "text-gray-900 font-semibold"
                            : "text-gray-700 "
                        }`}
                      >
                        {hoveredItem === "skipped" && (
                          <SkipForward className="w-4 h-4" />
                        )}
                        <span
                          className={currentPage === "skipped" ? "font-semibold" : ""}
                          style={currentPage === "skipped" ? {
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          } : {}}
                        >
                          Skipped Profiles
                        </span>
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
                className="px-4 py-2 font-mono text-sm transition duration-200 rounded-md flex items-center space-x-1 text-gray-700"
              >
                <span
                  className={currentPage === "profile" || currentPage === "settings" || currentPage === "blocked" ? "font-semibold" : ""}
                  style={currentPage === "profile" || currentPage === "settings" || currentPage === "blocked" ? {
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  } : {}}
                >
                  Account
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    activeDropdown === "account" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {activeDropdown === "account" && (
                <div className="absolute top-full pt-2 left-0 w-86 z-60">
                  <div className="border border-gray-200 rounded-sm shadow-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFB' }}>
                    <div className="p-2">
                      <button
                        onClick={() => navigate("/profile")}
                        onMouseEnter={() => setHoveredItem("profile")}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "profile"
                            ? "text-gray-900 font-semibold"
                            : "text-gray-700 "
                        }`}
                      >
                        {hoveredItem === "profile" && (
                          <User className="w-4 h-4" />
                        )}
                        <span
                          className={currentPage === "profile" ? "font-semibold" : ""}
                          style={currentPage === "profile" ? {
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          } : {}}
                        >
                          Profile
                        </span>
                      </button>
                      <button
                        onClick={() => navigate("/settings")}
                        onMouseEnter={() => setHoveredItem("settings")}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "settings"
                            ? "text-gray-900 font-semibold"
                            : "text-gray-700 "
                        }`}
                      >
                        {hoveredItem === "settings" && (
                          <Settings className="w-4 h-4" />
                        )}
                        <span
                          className={currentPage === "settings" ? "font-semibold" : ""}
                          style={currentPage === "settings" ? {
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          } : {}}
                        >
                          Account Settings
                        </span>
                      </button>
                      <button
                        onClick={() => navigate("/blocked")}
                        onMouseEnter={() => setHoveredItem("blocked")}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition duration-200 flex items-center space-x-3 ${
                          currentPage === "blocked"
                            ? "text-gray-900 font-semibold"
                            : "text-gray-700 "
                        }`}
                      >
                        {hoveredItem === "blocked" && (
                          <ShieldOff className="w-4 h-4" />
                        )}
                        <span
                          className={currentPage === "blocked" ? "font-semibold" : ""}
                          style={currentPage === "blocked" ? {
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          } : {}}
                        >
                          Blocked Profiles
                        </span>
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
            <span className="font-mono text-sm text-gray-600 hidden lg:inline">
              {userEmail}
            </span>
          )}
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-md font-mono text-sm text-red-600 transition duration-200 flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
