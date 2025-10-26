"use client";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileSection } from "./ProfileSection";
import type {
  ProfileWithDetails,
  MatchCandidate,
  PendingRequest,
} from "@/types";

interface ProfileDetailProps {
  profile: ProfileWithDetails | MatchCandidate | PendingRequest | null;
}

export function ProfileDetail({ profile }: ProfileDetailProps) {
  if (!profile) {
    return (
      <div className="p-6 text-center text-gray-500 font-mono">
        Select a profile to view details
      </div>
    );
  }

  const isCandidateProfile = (p: typeof profile): p is MatchCandidate =>
    "similarity_score" in p;
  const isPendingRequestProfile = (p: typeof profile): p is PendingRequest =>
    "created_at" in p;

  return (
    console.log(profile),
    (
      <>
        <ProfileHeader
          name={profile.profile.name}
          cityName={profile.profile.city_name}
          country={profile.profile.country}
          similarityScore={
            isCandidateProfile(profile) ? profile.similarity_score : undefined
          }
          requestDate={
            isPendingRequestProfile(profile) ? profile.created_at : undefined
          }
        />

        <div className="p-6 space-y-8 max-h-[calc(100vh-400px)] overflow-y-auto">
          <ProfileSection title="Bio" content={profile.profile.bio} />

          <ProfileSection
            title="Personal Achievement"
            content={profile.profile.achievements}
          />

          {profile.profile.experience && (
            <ProfileSection
              title="Experience"
              content={profile.profile.experience}
            />
          )}

          {profile.profile.education && (
            <ProfileSection
              title="Education"
              content={profile.profile.education}
            />
          )}

          {profile.venture && (
            <ProfileSection
              title="Venture Idea"
              subtitle={profile.venture.title}
              content={profile.venture.description}
            />
          )}

          {profile.preferences && (
            <ProfileSection
              title="looking for"
              subtitle={profile.preferences.title}
              content={profile.preferences.description}
            />
          )}

          {profile.availability_hours && (
            <ProfileSection
              title="availability"
              content={profile.availability_hours}
            />
          )}
        </div>
      </>
    )
  );
}
