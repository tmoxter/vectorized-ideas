import { useState } from "react";
import { supabaseClient } from "@/lib/supabase";

type InteractionAction = "like" | "pass" | "block" | "unblock";

export function useInteraction() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = supabaseClient();

  const recordInteraction = async (
    targetUserId: string,
    action: InteractionAction
  ): Promise<boolean> => {
    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return false;

      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetUserId,
          action,
        }),
      });

      if (!response.ok) {
        console.error("Error recording interaction:", await response.json());
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error recording interaction:", error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { recordInteraction, isSubmitting };
}
