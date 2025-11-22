"use client";
import { ProfileListItem } from "./ProfileListItem";
import { ProfileDetail } from "./ProfileDetail";
import type { ProfileWithDetails } from "@/types";

interface ProfileListLayoutProps {
  profiles: ProfileWithDetails[];
  selectedProfile: ProfileWithDetails | null;
  onSelectProfile: (profile: ProfileWithDetails) => void;
  children?: React.ReactNode;
}

export function ProfileListLayout({
  profiles,
  selectedProfile,
  onSelectProfile,
  children,
}: ProfileListLayoutProps) {
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-4 p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        <h2 className="font-mono font-semibold text-gray-900 mb-4">
          {profiles.length} {profiles.length === 1 ? "profile" : "profiles"}
        </h2>
        <div className="space-y-2">
          {profiles.map((profile) => (
            <ProfileListItem
              key={profile.id}
              profile={profile}
              isSelected={selectedProfile?.id === profile.id}
              onClick={() => onSelectProfile(profile)}
            />
          ))}
        </div>
      </div>

      <div className="col-span-8 rounded-xl border border-gray-500 shadow-lg overflow-hidden">
        <ProfileDetail profile={selectedProfile} />
        {children}
      </div>
    </div>
  );
}
