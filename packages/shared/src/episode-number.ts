export interface EpisodeNumber {
  number: number;
  suffix: string;
}

/** Renders the display form of an episode identifier, e.g. 103 + "v1" -> "103v1". */
export function formatEpisodeNumber(episode: EpisodeNumber): string {
  return `${episode.number}${episode.suffix}`;
}

/**
 * Orders episode identifiers numerically by `number` first (so "99p5" sorts
 * before "103v1" despite the string "1" < "9"), falling back to `suffix`
 * (alphabetical) to order variants of the same number, e.g. "357" before "357 (xe)".
 */
export function compareEpisodeNumbers(a: EpisodeNumber, b: EpisodeNumber): number {
  if (a.number !== b.number) return a.number - b.number;
  return a.suffix.localeCompare(b.suffix, "de");
}
