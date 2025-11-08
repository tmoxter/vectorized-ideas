'use client';

import { useState } from "react";
import { supabaseClient } from "@/lib/supabase";
import OidcButton from "@/components/OidcButton";

export default function LoginPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(false);

  // Check if email/password authentication should be enabled
  const showEmailAuth = process.env.NEXT_PUBLIC_ENABLE_EMAIL_AUTH === 'true';

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

  return (
    <div className="bg-white p-6 rounded border border-gray-200">
      <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
        {isLoginMode ? "welcome back" : "Join the search"}
      </h2>

      {showEmailAuth && (
        <>
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
          </div>
        </>
      )}

      <div className={showEmailAuth ? "mt-4" : ""}>
        <OidcButton />
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

      {showEmailAuth && (
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
      )}
    </div>
  );
}
