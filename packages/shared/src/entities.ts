import type { ContributorRole } from "./contributor-role.js";

export interface OutputChannel {
  id: number;
  name: string;
  pattern: string;
}

export interface SocialReference {
  id: number;
  channelId: number;
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
  artist: Artist;
}

export interface Track {
  id: number;
  title: string;
  albumId: number;
  album: Album;
  contributors: TrackContributor[];
}

export interface Episode {
  id: number;
  number: number;
  /** Free-text addition to `number` for irregular episode identifiers (e.g. "v1", " (xe)"); "" if none. */
  suffix: string;
  headline: string;
  topic: string;
  airDate: string | null;
  published: boolean;
}

export interface EpisodePlaylistEntry {
  position: number;
  track: Track;
}

export interface EpisodeDetail extends Episode {
  playlist: EpisodePlaylistEntry[];
}

/** One playlist entry from any episode, for the cross-episode setlist overview (§1.9). */
export interface SetlistEntry {
  id: number;
  episodeId: number;
  episodeNumber: number;
  episodeSuffix: string;
  track: Track;
}
