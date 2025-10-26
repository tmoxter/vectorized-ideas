"use client";
import { InfinitySpin } from "react-loader-spinner";
import type { BannerData } from "@/types";

interface TickerBannerProps {
  data: BannerData | null;
}

export function TickerBanner({ data }: TickerBannerProps) {
  if (!data) {
    return (
      <div className="mb-8 flex justify-center">
        <InfinitySpin color="#c7defb" width="200" />
      </div>
    );
  }

  const bannerText = `Currently, there are ${data.total_profiles} profiles matching your location filter. ${data.related_topics} are working on related topics.`;

  return (
    <div className="mb-8 overflow-hidden">
      <div className="ticker-animate flex gap-16 whitespace-nowrap">
        <p className="font-mono text-2xl font-semibold text-gray-800">
          {bannerText}
        </p>
        <p className="font-mono text-2xl font-semibold text-gray-800">
          {bannerText}
        </p>
      </div>
    </div>
  );
}
