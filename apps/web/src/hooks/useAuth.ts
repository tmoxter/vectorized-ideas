import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";

export function useAuth(redirectOnUnauthenticated = true) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = supabaseClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session && redirectOnUnauthenticated) {
      router.push("/");
      return;
    }

    setUser(session?.user || null);
    setIsLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return { user, isLoading, logout };
}
