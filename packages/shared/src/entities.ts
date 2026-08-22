import type { ContributorRole } from "./contributor-role.js";

export interface SocialReference {
  id: number;
  platform: string;
  referenceName: string;
}

export interface ArtistSummary {
  id: number;
  name: string;
  realName: string | null;
  websiteUrl: string | null;
}

export interface Artist extends ArtistSummary {
  socialReferences: SocialReference[];
}

export interface Album {
  id: number;
  title: string;
  link: string | null;
}

export interface TrackContributor {
  id: number;
  role: ContributorRole;
  position: number;
  artist: ArtistSummary;
}

export interface Track {
  id: number;
  title: string;
  albumId: number;
  album: Album;
  contributors: TrackContributor[];
}
