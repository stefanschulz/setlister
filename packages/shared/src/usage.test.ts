import { describe, expect, it } from "vitest";
import type { Album, SetlistEntry, Track } from "./entities.js";
import { buildUsageIndex, NO_USAGE } from "./usage.js";

const albumOne: Album = { id: 1, title: "Album One", link: null, labelId: null, label: null };
const albumTwo: Album = { id: 2, title: "Album Two", link: null, labelId: null, label: null };

function artist(id: number, name: string) {
  return { id, name, realName: null, websiteUrl: null, socialReferences: [] };
}

function track(id: number, title: string, album: Album, artistIds: number[]): Track {
  return {
    id,
    title,
    albumId: album.id,
    album,
    contributors: artistIds.map((artistId, position) => ({
      id: id * 100 + position,
      role: "ORIGINAL" as const,
      position,
      artist: artist(artistId, `Artist ${artistId}`),
    })),
  };
}

let nextEntryId = 1;
function entry(episodeId: number, episodeNumber: number, t: Track, suffix = ""): SetlistEntry {
  return {
    id: nextEntryId++,
    episodeId,
    episodeNumber,
    episodeSuffix: suffix,
    episodeHeadline: `Episode ${episodeNumber}`,
    episodeAirDate: null,
    track: t,
  };
}

const trackA = track(1, "Zeta", albumOne, [10]);
const trackB = track(2, "Alpha", albumOne, [10, 11]);
const trackC = track(3, "Other", albumTwo, [11]);

describe("buildUsageIndex", () => {
  it("returns empty maps for an empty setlist", () => {
    const index = buildUsageIndex([]);
    expect(index.tracks.size).toBe(0);
    expect(index.albums.size).toBe(0);
    expect(index.artists.size).toBe(0);
  });

  it("lists a track's episodes newest first, with the newest as lastEpisode", () => {
    const index = buildUsageIndex([entry(1, 5, trackA), entry(2, 9, trackA), entry(3, 7, trackA)]);
    const usage = index.tracks.get(trackA.id)!;
    expect(usage.episodes.map((e) => e.number)).toEqual([9, 7, 5]);
    expect(usage.lastEpisode?.number).toBe(9);
    expect(usage.lastEpisode?.headline).toBe("Episode 9");
  });

  it("counts an episode once even if the track appears in it twice", () => {
    const index = buildUsageIndex([entry(1, 5, trackA), entry(1, 5, trackA)]);
    expect(index.tracks.get(trackA.id)!.episodes).toHaveLength(1);
  });

  it("orders variants of the same episode number by suffix", () => {
    const index = buildUsageIndex([entry(1, 5, trackA, "v1"), entry(2, 5, trackA)]);
    expect(index.tracks.get(trackA.id)!.episodes.map((e) => e.suffix)).toEqual(["v1", ""]);
  });

  it("builds an album's episodes from all its played tracks, each episode once", () => {
    const index = buildUsageIndex([entry(1, 5, trackA), entry(1, 5, trackB), entry(2, 6, trackB)]);
    const usage = index.albums.get(albumOne.id)!;
    expect(usage.episodes.map((e) => e.number)).toEqual([6, 5]);
  });

  it("lists an album's played tracks by title with their episode counts, skipping unplayed ones", () => {
    const index = buildUsageIndex([entry(1, 5, trackA), entry(1, 5, trackB), entry(2, 6, trackB)]);
    expect(index.albums.get(albumOne.id)!.tracks.map((t) => [t.track.title, t.episodeCount])).toEqual([
      ["Alpha", 2],
      ["Zeta", 1],
    ]);
  });

  it("links an artist to every episode of every track they contributed to", () => {
    const index = buildUsageIndex([entry(1, 5, trackA), entry(2, 6, trackB), entry(3, 7, trackC)]);
    expect(index.artists.get(10)!.episodes.map((e) => e.number)).toEqual([6, 5]);
    expect(index.artists.get(11)!.episodes.map((e) => e.number)).toEqual([7, 6]);
  });

  it("lists an artist's albums by title with episode counts, only for played tracks", () => {
    const index = buildUsageIndex([entry(1, 5, trackA), entry(2, 6, trackB), entry(3, 7, trackC)]);
    expect(index.artists.get(11)!.albums.map((a) => [a.album.title, a.episodeCount])).toEqual([
      ["Album One", 1],
      ["Album Two", 1],
    ]);
    expect(index.artists.get(10)!.albums.map((a) => [a.album.title, a.episodeCount])).toEqual([
      ["Album One", 2],
    ]);
  });

  it("has no entry for things that were never played", () => {
    const index = buildUsageIndex([entry(1, 5, trackA)]);
    expect(index.tracks.get(trackB.id)).toBeUndefined();
    expect(index.albums.get(albumTwo.id)).toBeUndefined();
    expect(index.artists.get(11)).toBeUndefined();
  });

  it("exposes NO_USAGE as an empty fallback", () => {
    expect(NO_USAGE).toEqual({ episodes: [], lastEpisode: null });
  });
});
