"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase";
import TypewriterHero from "@/components/TypewriterHero";
import Footer from "@/components/Footer";
import FAQ, { type FAQItem } from "@/components/FAQ";
import MagneticLoginButton from "@/components/MagneticLoginButton";
import SectionHeader from "@/components/SectionHeader";
import {
  ArrowUpZA,
  Telescope,
  Handshake,
  Map,
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
    {
      question: "I lost access to my linked-in account and would like to delete my profile.",
      answer:
          "If you can log-in via linked-in, please do so and permanentlty delete your account under 'Account Settings'. If have really lost "
          + "access to your linked-in credentials, send me an email to delete your data."
    }
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
      <main className="relative z-10 px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div>
            <div className="flex flex-col lg:flex-row items-start gap-8 mb-12">
              <div className="flex-1 max-w-5xl">
                <TypewriterHero />
                <p className="text-xl text-gray-900 mb-8 leading-relaxed font-mono">
                  Vectorized-ideas is a lightweight, minimal, and free co-founder matchig platform. Use your project and venture ideas to find collaborators and connect with those already tackling the same
                  problems as you.
                </p>
              </div>
            </div>

            {/* Content Section - How it works + Sign Up Form */}
            <div className="flex flex-col lg:flex-row gap-8 mb-12 py-5">
              {/* How it works */}
              <div className="flex-1">
                <SectionHeader title="How it works" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded border border-gray-900 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="w-11 h-11 rounded flex items-center justify-center mb-4 icon-gradient">
                    <ArrowUpZA className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                    Semantic Similarity
                  </h3>
                  <p className="text-gray-900 text-m">
                    Describe what you are working on, embed your ideas as
                    semantic vectors, and search through profiles of others who
                    are either already working on similar ideas or want to solve
                    the same problems.
                  </p>
                </div>

                <div className="p-6 rounded border border-gray-900 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="w-10 h-10 rounded flex items-center justify-center mb-4 icon-gradient">
                    <Telescope className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                    Visibility
                  </h3>
                  <p className="text-gray-900 text-m">
                    You share your first name and region, and give an overview
                    over your background, skills, and accomplishments. Of
                    course, you also get to see each other's project ideas along
                    some optional co-founder preferences. Please don't share any
                    sensitive information.
                  </p>
                </div>

                <div className="p-6 rounded border border-gray-900 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="w-10 h-10 rounded flex items-center justify-center mb-4 icon-gradient">
                    <Handshake className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                    Connect on LinkedIn
                  </h3>
                  <p className="text-gray-900 text-m">
                    If both parties are interested, your LinkedIn profiles are
                    shared to connect directly. We don't have a chat feature for
                    now to keep it lightweight. <br />
                  </p>
                </div>

                <div className="p-6 rounded border border-gray-900 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="w-10 h-10 rounded flex items-center justify-center mb-4 icon-gradient">
                    <Map className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
                    Discover
                  </h3>
                  <p className="text-gray-900 text-m">
                    Work in progress: Discover how unique your ideas are and view aggregates how many out have
                    tackled the same problems.
                    <br />
                  </p>
                </div>
                </div>
              </div>

              {/* Sign Up / Login Form */}
              <div className="lg:w-96 min-h-[400px]">
                <MagneticLoginButton />
              </div>
            </div>

            {/* Technical Note */}
            <div className="max-w-5xl">

              <SectionHeader title="Free and open-source" />
              <div className="mt-6 rounded mb-10">
                <p className="text-m font-mono text-gray-900">
                  Vectorized-ideas is an experiment and a side project. It is completely free and does not generate any profit, e.g., by showing you adds.
                  It is also in an experimental state, so if you find any bugs or have
                  suggestions, please open an issue or a PR on
                  GitHub.
                  <a
                    href="https://github.com"
                    className="text-gray-900 hover:underline ml-1"
                    >
                    <strong>View source on GH →</strong>
                  </a>
                </p>
              </div>

              {/* FAQ Section */}
              <SectionHeader title="FAQ" />
              <FAQ items={faqItems} />

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
