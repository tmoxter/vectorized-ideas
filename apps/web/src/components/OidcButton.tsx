'use client';

import { useState } from "react";
import { supabaseClient } from "@/lib/supabase";

const supabase = supabaseClient();

export default function LoginButton() {
  const [message, setMessage] = useState("");
  const mode = process.env.NEXT_PUBLIC_AUTH_MODE ?? 'linkedin';

  const onClick = async () => {
    setMessage("");

    try {
      if (mode === 'dev-magiclink') {
        // Dev mode: magic link login
        const r = await fetch('/api/dev-login', { method: 'GET' });
        if (!r.ok) {
          setMessage('Error: Dev login failed');
          return;
        }
        // In case redirect doesn't happen automatically
        const url = r.url; // NextResponse.redirect location
        if (url) window.location.href = url;
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc', // or 'linkedin'
        options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` }
      });

      if (error) {
        setMessage("Error: " + error.message);
      }
    } catch (error) {
      setMessage("An unexpected error occurred");
    }
  };

  return (
    <>
      <button
        onClick={onClick}
        className="w-full bg-black text-white py-3 px-4 rounded font-mono hover:bg-gray-800 transition duration-200 disabled:opacity-50"
      >
        Continue with LinkedIn
      </button>

      {message && (
        <div className="mt-3 p-3 rounded text-sm font-mono bg-red-50 text-red-600 border border-red-200">
          {message}
        </div>
      )}
    </>
  );
}