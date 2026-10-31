import type { Album, SetlistEntry, Track } from "./entities.js";
import { compareEpisodeNumbers } from "./episode-number.js";

/** One episode an album/track/artist was played in. */
export interface UsageEpisode {
  episodeId: number;
  number: number;
  suffix: string;
  headline: string;
  airDate: string | null;
}

export interface Usage {
  /** Episodes it was played in (distinct), newest episode number first. */
  episodes: UsageEpisode[];
  /** The newest episode it was played in, or null if never played. */
  lastEpisode: UsageEpisode | null;
}

export interface AlbumUsage extends Usage {
  /** The album's played tracks (distinct), by title, with the number of episodes each was played in. */
  tracks: { track: Track; episodeCount: number }[];
}

export interface ArtistUsage extends Usage {
  /** Albums with at least one played track the artist contributed to, by title, with the number of episodes. */
  albums: { album: Album; episodeCount: number }[];
}

export interface UsageIndex {
  tracks: Map<number, Usage>;
  albums: Map<number, AlbumUsage>;
  artists: Map<number, ArtistUsage>;
}

export const NO_USAGE: Usage = { episodes: [], lastEpisode: null };

/**
 * Derives, from the cross-episode setlist, where each track, album and artist
 * was played ("Verwendung"): every episode that contains it, drafts included.
 * Albums and artists are linked only through played tracks, so an album/artist
 * that was never played has no entry — use `NO_USAGE` as the fallback.
 */
export function buildUsageIndex(entries: SetlistEntry[]): UsageIndex {
  const trackEpisodes = new Map<number, Map<number, UsageEpisode>>();
  const albumEpisodes = new Map<number, Map<number, UsageEpisode>>();
  const artistEpisodes = new Map<number, Map<number, UsageEpisode>>();
  const albumTracks = new Map<number, Map<number, { track: Track; episodes: Set<number> }>>();
  const artistAlbums = new Map<number, Map<number, { album: Album; episodes: Set<number> }>>();

  for (const entry of entries) {
    const { track } = entry;
    const episode: UsageEpisode = {
      episodeId: entry.episodeId,
      number: entry.episodeNumber,
      suffix: entry.episodeSuffix,
      headline: entry.episodeHeadline,
      airDate: entry.episodeAirDate,
    };

    addEpisode(trackEpisodes, track.id, episode);
    addEpisode(albumEpisodes, track.album.id, episode);
    const tracksOfAlbum = getOrCreate(albumTracks, track.album.id, () => new Map());
    const playedTrack = tracksOfAlbum.get(track.id);
    if (playedTrack) playedTrack.episodes.add(episode.episodeId);
    else tracksOfAlbum.set(track.id, { track, episodes: new Set([episode.episodeId]) });

    for (const artistId of new Set(track.contributors.map((c) => c.artist.id))) {
      addEpisode(artistEpisodes, artistId, episode);
      const albums = getOrCreate(artistAlbums, artistId, () => new Map());
      const existing = albums.get(track.album.id);
      if (existing) existing.episodes.add(episode.episodeId);
      else albums.set(track.album.id, { album: track.album, episodes: new Set([episode.episodeId]) });
    }
  }

  const tracks = new Map<number, Usage>();
  for (const [id, eps] of trackEpisodes) tracks.set(id, toUsage(eps));

  const albums = new Map<number, AlbumUsage>();
  for (const [id, eps] of albumEpisodes) {
    const played = [...(albumTracks.get(id)?.values() ?? [])]
      .map(({ track, episodes }) => ({ track, episodeCount: episodes.size }))
      .sort((a, b) => a.track.title.localeCompare(b.track.title, "de"));
    albums.set(id, { ...toUsage(eps), tracks: played });
  }

  const artists = new Map<number, ArtistUsage>();
  for (const [id, eps] of artistEpisodes) {
    const played = [...(artistAlbums.get(id)?.values() ?? [])]
      .map(({ album, episodes }) => ({ album, episodeCount: episodes.size }))
      .sort((a, b) => a.album.title.localeCompare(b.album.title, "de"));
    artists.set(id, { ...toUsage(eps), albums: played });
  }

  return { tracks, albums, artists };
}

function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
  let value = map.get(key);
  if (!value) {
    value = create();
    map.set(key, value);
  }
  return value;
}

function addEpisode(index: Map<number, Map<number, UsageEpisode>>, id: number, episode: UsageEpisode) {
  getOrCreate(index, id, () => new Map()).set(episode.episodeId, episode);
}

function toUsage(episodes: Map<number, UsageEpisode>): Usage {
  const sorted = [...episodes.values()].sort((a, b) => compareEpisodeNumbers(b, a));
  return { episodes: sorted, lastEpisode: sorted[0] ?? null };
}
