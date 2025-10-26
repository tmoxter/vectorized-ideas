"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase";
import TypewriterHero from "@/components/TypewriterHero";
import Footer from "@/components/Footer";
import {
  ArrowUpZA,
  Telescope,
  Handshake,
  Map,
  ChevronDown,
} from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    const supabase = supabaseClient();

    try {
      if (isLoginMode) {
        // Handle login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage("Error: " + error.message);
        } else if (data.session) {
          setMessage("Logged in successfully!");
          window.location.href = "/auth/callback";
        }
      } else {
        // Handle signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          setMessage("Error: " + error.message);
        } else if (data.user && !data.session) {
          setMessage("Check your email to confirm your account!");
        } else if (data.session) {
          setMessage("Account created successfully!");
          window.location.href = "/auth/callback";
        }
      }
    } catch (error) {
      setMessage("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const supabase = supabaseClient();

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage("Error: " + error.message);
      }
    } catch (error) {
      setMessage("An unexpected error occurred");
    }
  };

  const handleAppleSignIn = async () => {
    const supabase = supabaseClient();

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage("Error: " + error.message);
      }
    } catch (error) {
      setMessage("An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-breathe pb-10">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200">
        <nav className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (isAuthenticated) {
                  window.location.href = "/matches";
                } else {
                  window.location.reload();
                }
              }}
              className="flex items-center space-x-3 hover:opacity-80"
            >
              <div className="w-6 h-6 icon-gradient rounded flex items-center justify-center">
                <span className="text-white font-mono text-xl">
                  {"\u{1D708}"}
                </span>
              </div>
              <span className="font-mono text-lg text-gray-900">
                vectorized-ideas
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div>
            <div className="flex flex-col lg:flex-row items-start gap-8 mb-12">
              <div className="flex-1 max-w-4xl">
                <TypewriterHero />
                <p className="text-lg text-gray-700 mb-8 leading-relaxed font-mono">
                  Use your projects and venture ideas to find collaborators with
                  conceptually similar visions and connect with those who want
                  to work on related challenges or are already tackling the same
                  problems as you.
                </p>
              </div>
              <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
                <Image
                  src="/rocket.svg"
                  alt="Light bulb illustration"
                  width={256}
                  height={256}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Content Section - How it works + Sign Up Form */}
            <div className="flex flex-col lg:flex-row gap-8 mb-12">
              {/* How it works */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded border border-gray-200">
                  <div className="w-11 h-11 rounded flex items-center justify-center mb-4 icon-gradient">
                    <ArrowUpZA className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                    Semantic Similarity
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Describe what you are working on, embed your ideas as
                    semantic vectors, and search through profiles of others who
                    are either already working on similar ideas or want to solve
                    the same problems.
                  </p>
                </div>

                <div className="p-6 bg-white rounded border border-gray-200">
                  <div className="w-10 h-10 rounded flex items-center justify-center mb-4 icon-gradient">
                    <Telescope className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                    Visibility
                  </h3>
                  <p className="text-gray-600 text-sm">
                    You share your first name and region, and give an overview
                    over your background, skills, and accomplishments. Of
                    course, you also get to see each other's project ideas along
                    some optional co-founder preferences. Please don't share any
                    sensitive information.
                  </p>
                </div>

                <div className="p-6 bg-white rounded border border-gray-200">
                  <div className="w-10 h-10 rounded flex items-center justify-center mb-4 icon-gradient">
                    <Handshake className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                    Connect on LinkedIn
                  </h3>
                  <p className="text-gray-600 text-sm">
                    If both parties are interested, your LinkedIn profiles are
                    shared to connect directly. We don't have a chat feature for
                    now to keep it lightweight. <br />
                  </p>
                </div>

                <div className="p-6 bg-white rounded border border-gray-200">
                  <div className="w-10 h-10 rounded flex items-center justify-center mb-4 icon-gradient">
                    <Map className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                    Compare
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Get aggregated insights into how much attention your field
                    is getting. Your ideas are only shared with potential
                    matches you'll soon see a map of venture ideas and how you
                    fit in it.
                    <br />
                  </p>
                </div>
              </div>

              {/* Sign Up / Login Form */}
              <div className="lg:w-96">
                <div className="bg-white p-6 rounded border border-gray-200">
                  <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
                    {isLoginMode ? "welcome back" : "Join the search"}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        placeholder="email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>

                    <div>
                      <input
                        type="password"
                        placeholder={
                          isLoginMode
                            ? "password"
                            : "password (min 6 characters)"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={isLoginMode ? 1 : 6}
                        className="w-full px-4 py-3 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !email || !password}
                      className="w-full bg-black text-white py-3 px-4 rounded font-mono hover:bg-gray-800 transition duration-200 disabled:opacity-50"
                    >
                      {isLoading
                        ? isLoginMode
                          ? "logging in..."
                          : "creating account..."
                        : isLoginMode
                          ? "log in"
                          : "create account"}
                    </button>
                  </form>

                  <div className="mt-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">or</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <button
                        onClick={handleGoogleSignIn}
                        className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded font-mono hover:bg-gray-50 transition duration-200"
                      >
                        continue with google
                      </button>

                      <button
                        onClick={handleAppleSignIn}
                        className="w-full bg-black border border-black text-white py-3 px-4 rounded font-mono hover:bg-gray-800 transition duration-200"
                      >
                        continue with apple
                      </button>
                    </div>
                  </div>

                  {message && (
                    <div
                      className={`mt-4 p-3 rounded text-sm font-mono ${
                        message.includes("Error")
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : "bg-green-50 text-green-600 border border-green-200"
                      }`}
                    >
                      {message}
                    </div>
                  )}

                  {/* Toggle between login and signup */}
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => {
                        setIsLoginMode(!isLoginMode);
                        setMessage("");
                        setEmail("");
                        setPassword("");
                      }}
                      className="font-mono text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      {isLoginMode
                        ? "need an account? sign up"
                        : "already have an account? log in"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Note */}
            <div className="max-w-4xl">
              {/* FAQ Section */}
              <div className="mt-12">
                <div className="space-y-4">
                  {/* FAQ Item 1 */}
                  <div className="bg-white rounded border border-gray-200 overflow-hidden">
                    <button
                      onClick={() =>
                        setExpandedFaq(expandedFaq === 0 ? null : 0)
                      }
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition duration-200"
                    >
                      <span className="font-mono font-semibold text-gray-900">
                        Aren't there already alternative platforms out there?
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                          expandedFaq === 0 ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {expandedFaq === 0 && (
                      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <p className="font-mono text-sm text-gray-700">
                          Yes, but I found it hard to find people with aligned
                          visions on them.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* FAQ Item 2 */}
                  <div className="bg-white rounded border border-gray-200 overflow-hidden">
                    <button
                      onClick={() =>
                        setExpandedFaq(expandedFaq === 1 ? null : 1)
                      }
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition duration-200"
                    >
                      <span className="font-mono font-semibold text-gray-900">
                        Won't other users steal my venture ideas?
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                          expandedFaq === 1 ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {expandedFaq === 1 && (
                      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <p className="font-mono text-sm text-gray-700">
                          First time founders tend to be secretive about their
                          ideas, second-time founders shout them from the
                          rooftops :).
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-12 p-4 bg-gray-50 rounded border-l-4 border-blue-950">
                <p className="text-sm font-mono text-gray-00">
                  <strong>Note:</strong> Vectorizied-ideas is completely free to
                  use and in an experimental state. If you find any bugs or have
                  suggestions, please open an issue or even better a PR on
                  GitHub.
                  <a
                    href="https://github.com"
                    className="text-blue-950 hover:underline ml-1"
                  >
                    View source →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
