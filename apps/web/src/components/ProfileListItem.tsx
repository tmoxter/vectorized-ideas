"use client";
import type { ProfileWithDetails } from "@/types";

interface ProfileListItemProps {
  profile: ProfileWithDetails;
  isSelected: boolean;
  onClick: () => void;
}

export function ProfileListItem({
  profile,
  isSelected,
  onClick,
}: ProfileListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition duration-200 ${
        isSelected
          ? "border-black shadow-lg"
          : "border-gray-300 hover:border-gray-950 shadow-md"
      }`}
    >
      <div className="font-mono font-semibold text-gray-900">
        {profile.profile.name}
      </div>
      {profile.profile.city_name && profile.profile.country && (
        <div className="font-mono text-sm text-gray-600 mt-1">
          📍 {profile.profile.city_name}, {profile.profile.country}
        </div>
      )}
      {profile.venture && (
        <div className="font-mono text-xs text-gray-500 mt-2 line-clamp-2">
          {profile.venture.title}
        </div>
      )}
    </button>
  );
}
