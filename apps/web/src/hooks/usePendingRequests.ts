import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import type { PendingRequest } from "@/types";

export function usePendingRequests(limit = 20) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const supabase = supabaseClient();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(`/api/pending-requests?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData?.error || "Unknown error");
        setRequests([]);
        return;
      }

      const result = await response.json();
      const pendingRequests = result?.items || [];

      console.log(
        "[pending-requests] Number of requests:",
        pendingRequests.length
      );

      setRequests(pendingRequests);
    } catch (err) {
      setError("Failed to load pending requests");
      console.error("Error loading pending requests:", err);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { requests, isLoading, error, reload: loadRequests };
}
