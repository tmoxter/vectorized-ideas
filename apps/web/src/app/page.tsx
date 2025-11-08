"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase";
import TypewriterHero from "@/components/TypewriterHero";
import Footer from "@/components/Footer";
import FAQ, { type FAQItem } from "@/components/FAQ";
import LoginPanel from "@/components/LoginPanel";
import {
  ArrowUpZA,
  Telescope,
  Handshake,
  Gem,
} from "lucide-react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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


  const faqItems: FAQItem[] = [
    {
      question: "Aren't there already alternative platforms out there?",
      answer:
        "Yes, but we found it hard to find people on them who want to work on the same problems. "
        + "Usually you only get to specify the industry or field you are interested in but the emphasis "
        + "is on people's backgrounds.",
    },
    {
      question: "Do I need to login with my linkedin account?",
      answer:
        "Yes, since we want to keep this lightweight, avoid implementing a chat feature or store any credentials ourselves, "
        + "at least for now, you can only log in with linkedin. Since you are sharing your profile with potential co-founders "
        + "you need it anyway.",
    },
    {
      question: "Won't other users steal my venture ideas?",
      answer:
        "Sharing your idea here means making it publically visible. But many founders will tell you that "
        + "the secrecy is rarely justified. Please don't share any sensitive information that you would "
        + "want to protect. If you delete your account all your data is wiped permanently. "
        + "<br/> <br/>"
        + "'You can always recognize the first-timers because they’re too secretive. And "
        + "you can always recognize the experienced ones because they don’t care.' - Naval Ravikant",
    },
  ];

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
              <Image
                src="/vi.svg"
                alt="vectorized-ideas logo"
                width={32}
                height={32}
              />
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
                    <Gem className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                    Free and Without Ads
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Vectorized-ideas is an experiment, a side project, and may hopefully become a community effort
                    if people find it helpful. It is completely free.
                    <br />
                  </p>
                </div>
              </div>

              {/* Sign Up / Login Form */}
              <div className="lg:w-96">
                <LoginPanel />
              </div>
            </div>

            {/* Technical Note */}
            <div className="max-w-4xl">
              {/* FAQ Section */}
              <FAQ items={faqItems} />

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
