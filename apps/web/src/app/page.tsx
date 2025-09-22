"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(false);

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
          window.location.href = "/profile";
        }
      } else {
        // Handle signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`,
          },
        });

        if (error) {
          setMessage("Error: " + error.message);
        } else if (data.user && !data.session) {
          setMessage("Check your email to confirm your account!");
        } else if (data.session) {
          setMessage("Account created successfully!");
          window.location.href = "/profile";
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
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profile`,
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
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/profile`,
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200">
        <nav className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <span className="text-white font-mono text-sm">λ</span>
            </div>
            <span className="font-mono text-lg text-gray-900">vectorized-ideas</span>
          </div>
          <a href="https://github.com" className="text-gray-600 hover:text-gray-900 font-mono text-sm">
            github
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-mono font-bold text-gray-900 mb-6 leading-tight">
              co-founder matching via
              <span className="text-blue-600"> semantic similarity</span>
            </h1>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed font-mono">
              Transform your project ideas into vector embeddings and find co-founders with conceptually similar visions. 
              No keyword matching — actual semantic understanding of what you want to build.
            </p>

            {/* How it works */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="p-6 bg-white rounded border border-gray-200">
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mb-4">
                  <span className="font-mono text-sm font-bold">01</span>
                </div>
                <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">Vector Embeddings</h3>
                <p className="text-gray-600 text-sm">Describe your project idea. We convert it to high-dimensional vectors using transformer models.</p>
              </div>

              <div className="p-6 bg-white rounded border border-gray-200">
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mb-4">
                  <span className="font-mono text-sm font-bold">02</span>
                </div>
                <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">Similarity Search</h3>
                <p className="text-gray-600 text-sm">Cosine similarity calculation finds others with conceptually similar ideas, not just keyword matches.</p>
              </div>

              <div className="p-6 bg-white rounded border border-gray-200">
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mb-4">
                  <span className="font-mono text-sm font-bold">03</span>
                </div>
                <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">Connect</h3>
                <p className="text-gray-600 text-sm">Browse matches ranked by semantic similarity score. Direct contact with potential co-founders.</p>
              </div>
            </div>

            {/* Sign Up / Login Form */}
            <div className="max-w-md">
              <div className="bg-white p-6 rounded border border-gray-200">
                <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
                  {isLoginMode ? "welcome back" : "join the experiment"}
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
                      placeholder={isLoginMode ? "password" : "password (min 6 characters)"}
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
                      ? (isLoginMode ? "logging in..." : "creating account...") 
                      : (isLoginMode ? "log in" : "create account")
                    }
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
                  <div className={`mt-4 p-3 rounded text-sm font-mono ${
                    message.includes("Error") 
                      ? "bg-red-50 text-red-600 border border-red-200" 
                      : "bg-green-50 text-green-600 border border-green-200"
                  }`}>
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
                      : "already have an account? log in"
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Technical Note */}
            <div className="mt-12 p-4 bg-gray-100 rounded border-l-4 border-blue-600">
              <p className="text-sm font-mono text-gray-700">
                <strong>Note:</strong> This is an open source experiment in semantic matching for co-founder discovery. 
                Built with transformer embeddings, vector similarity search, and minimal UI. 
                <a href="https://github.com" className="text-blue-600 hover:underline ml-1">View source →</a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6 mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                  <span className="text-white font-mono text-xs">λ</span>
                </div>
                <span className="font-mono text-sm text-gray-700">vectorized-ideas</span>
              </div>
              <p className="text-gray-500 text-sm font-mono">
                semantic co-founder matching experiment
              </p>
            </div>
            
            <div className="flex space-x-6 text-sm font-mono">
              <a href="#" className="text-gray-500 hover:text-gray-700">github</a>
              <a href="#" className="text-gray-500 hover:text-gray-700">docs</a>
              <a href="#" className="text-gray-500 hover:text-gray-700">api</a>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-6 pt-6 text-center">
            <p className="text-gray-400 text-xs font-mono">built for hackers, by hackers</p>
          </div>
        </div>
      </footer>
    </div>
  );
}