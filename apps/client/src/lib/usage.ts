import { compareEpisodeNumbers, type Usage } from '@setlister/shared'

/** Sort comparison for the "Zuletzt gespielt" column — never-played items sort lowest. */
export function compareLastPlayed(a: Usage, b: Usage): number {
  if (!a.lastEpisode || !b.lastEpisode) {
    return Number(Boolean(a.lastEpisode)) - Number(Boolean(b.lastEpisode))
  }
  return compareEpisodeNumbers(a.lastEpisode, b.lastEpisode)
}

/** Sort comparison for the "Gespielt" column (number of episodes). */
export function comparePlayed(a: Usage, b: Usage): number {
  return a.episodes.length - b.episodes.length
}
