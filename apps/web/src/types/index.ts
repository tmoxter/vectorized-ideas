export interface City {
  id: number;
  name: string;
  admin1?: string | null;
  country: string;
  iso2: string;
  label: string;
  population: number | null;
}

export interface Venture {
  title: string;
  description: string;
}

export interface Preferences {
  title: string;
  description: string;
}

export interface ProfileData {
  name: string;
  bio: string;
  achievements?: string;
  experience?: string;
  education?: string;
  city_name?: string;
  country?: string;
  avatarurl?: string; // LinkedIn URL - only available for matches
}

export interface BaseProfile {
  id: string;
  timezone?: string;
  stage?: string;
  availability_hours?: string;
  profile: ProfileData;
}

export interface ProfileWithDetails extends BaseProfile {
  venture?: Venture;
  preferences?: Preferences;
}

export interface MatchCandidate extends ProfileWithDetails {
  similarity_score?: number;
}

export interface PendingRequest extends ProfileWithDetails {
  created_at: string;
}

export interface ProfileFormData {
  name: string;
  bio: string;
  achievements: string;
  experience: string;
  education: string;
  city_id: number | null;
  linkedinUrl: string;
  venture_title: string;
  venture_description: string;
  cofounder_preferences_title: string;
  cofounder_preferences_description: string;
}

export interface BannerData {
  total_profiles: number;
  related_topics: number;
}
