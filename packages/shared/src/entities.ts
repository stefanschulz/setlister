import type { ContributorRole } from "./contributor-role.js";

export interface OutputChannel {
  id: number;
  name: string;
  pattern: string;
  headlinePattern: string;
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

export interface Label {
  id: number;
  name: string;
  link: string | null;
  facebookReferenceName: string | null;
}

export interface Album {
  id: number;
  title: string;
  link: string | null;
  labelId: number | null;
  label: Label | null;
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
  teaser: string | null;
  script: string | null;
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
