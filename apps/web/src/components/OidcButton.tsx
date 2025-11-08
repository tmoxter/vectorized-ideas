'use client';

import { useState } from "react";
import { supabaseClient } from "@/lib/supabase";

const supabase = supabaseClient();

export default function LoginButton() {
  const [message, setMessage] = useState("");

  const onClick = async () => {
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
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