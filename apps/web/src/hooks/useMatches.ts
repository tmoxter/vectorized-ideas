import { useState, useEffect } from "react";
import type { MatchCandidate } from "@/types";

export function useMatches(userId: string | undefined, limit = 20) {
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (userId) {
      loadMatches();
    }
  }, [userId]);

  const loadMatches = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/embeddings?userId=${userId}&limit=${limit}`);

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData?.error || "Unknown error");
        setCandidates([]);
        return;
      }

      const result = await response.json();
      const matchCandidates = result?.items || [];

      if (!matchCandidates || matchCandidates.length === 0) {
        setError(
          "No potential matches found. Make sure you have published your profile and there are other users with similar ventures."
        );
        setCandidates([]);
        return;
      }

      setCandidates(matchCandidates);
    } catch (err) {
      setError("Failed to load matches");
      console.error("Error loading matches:", err);
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { candidates, isLoading, error, reload: loadMatches };
}
