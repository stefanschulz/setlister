import { formatContributorList } from "./contributor-format.js";
import type { ContributorRole } from "./contributor-role.js";
import type { OutputChannel } from "./entities.js";
import { formatEpisodeNumber } from "./episode-number.js";
import type { EpisodeNumber } from "./episode-number.js";

export interface ArtistForOutput {
  name: string;
  websiteUrl: string | null;
  socialReferences: { channelId: number; referenceName: string }[];
}

export interface ContributorForOutput {
  role: ContributorRole;
  position: number;
  artist: ArtistForOutput;
}

export interface TrackForOutput {
  title: string;
  album: {
    title: string;
    link: string | null;
    label: { id: number; name: string; facebookReferenceName: string | null } | null;
  };
  contributors: ContributorForOutput[];
}

export interface PlaylistEntryForOutput {
  position: number;
  track: TrackForOutput;
}

export interface EpisodeForOutput extends EpisodeNumber {
  headline: string;
  teaser: string | null;
  script: string | null;
}

export interface OutputBundle {
  html: string;
  /** The playlist as JSON for the syndae tracklist import (see docs/IMPORT-TRACKLIST.md). */
  tracklistJson: string;
  /** Same listing as `html`, but plain text (no tags, no links). */
  plainText: string;
  /** Keyed by OutputChannel.id, since channel names are user-defined and not fixed. */
  text: Record<number, string>;
  /** Full ready-to-post caption per channel (headline pattern, {artists} = that channel's `text`). */
  headlineText: Record<number, string>;
  /** The episode's teaser note, followed by an artist/album list. */
  introText: string;
  /** The episode's script note, verbatim ("" if none). */
  scriptText: string;
  /** The playlist's labels' Facebook reference names, "+++"-wrapped and -separated. */
  labelsText: string;
}

export function buildAllOutputs(
  entries: PlaylistEntryForOutput[],
  channels: OutputChannel[],
  episode: EpisodeForOutput,
): OutputBundle {
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  const text: Record<number, string> = {};
  const headlineText: Record<number, string> = {};
  for (const channel of channels) {
    text[channel.id] = buildTextFragment(sorted, channel);
    headlineText[channel.id] = buildHeadlineFragment(text[channel.id], episode, channel);
  }

  return {
    html: buildHtmlFragment(sorted),
    tracklistJson: buildTracklistJson(sorted),
    plainText: buildPlainTextFragment(sorted),
    text,
    headlineText,
    introText: buildIntroFragment(sorted, episode.teaser ?? ""),
    scriptText: episode.script ?? "",
    labelsText: buildLabelsFragment(sorted),
  };
}

/**
 * Synthetic channel id for buildIntroFragment's use of buildTextFragment
 * below — never matches a real OutputChannel.id (which start at 1), so
 * referenceNameForChannel always falls back to the artist's plain name.
 */
const INTRO_LIST_CHANNEL_ID = -1;

/**
 * Renders the Intro-Text: the episode's free-text teaser note, followed by
 * a blank line and an artist/album list — the same "<Künstler°> (<Album>)"
 * format the (now retired) "Teaser" output channel used, reusing
 * buildTextFragment with a synthetic channel so plain artist names are used
 * (Intro-Text isn't posted to any one channel, so no reference-name
 * substitution applies).
 */
export function buildIntroFragment(entries: PlaylistEntryForOutput[], teaser: string): string {
  const list = buildTextFragment(entries, {
    id: INTRO_LIST_CHANNEL_ID,
    name: "",
    pattern: "{artists} ({album})",
    headlinePattern: "",
  });
  const teaserTrimmed = teaser.trim();
  if (teaserTrimmed && list) return `${teaserTrimmed}\n\n${list}`;
  return teaserTrimmed || list;
}

/**
 * Renders the playlist's involved labels' Facebook reference names — one per
 * distinct label (by id, so same-named labels aren't accidentally merged),
 * skipping labels with no Facebook reference name set, each "@"-prefixed and
 * on its own line, led/separated/closed by a "+++" line, e.g.:
 * ```
 * +++
 * @Label A
 * +++
 * @Label B
 * +++
 * ```
 * Empty if no track's album has a label with a Facebook reference name.
 */
export function buildLabelsFragment(entries: PlaylistEntryForOutput[]): string {
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  const seen = new Set<number>();
  const names: string[] = [];
  for (const { track } of sorted) {
    const label = track.album.label;
    if (!label || seen.has(label.id)) continue;
    seen.add(label.id);
    if (label.facebookReferenceName) {
      // "@" is the conventional prefix for a social handle; normalize here so
      // it doesn't matter whether it was typed in when the label was entered.
      names.push(label.facebookReferenceName.startsWith("@") ? label.facebookReferenceName : `@${label.facebookReferenceName}`);
    }
  }

  return names.length > 0 ? `+++\n${names.join("\n+++\n")}\n+++` : "";
}

/** Same one-line-per-track listing as `buildHtmlFragment`, but plain text (no tags, no links). */
export function buildPlainTextFragment(entries: PlaylistEntryForOutput[]): string {
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  const lines = sorted.map(({ track }) => {
    const contributors = formatContributorList(
      track.contributors.map((c) => ({ name: c.artist.name, role: c.role, position: c.position })),
    );
    return `${contributors} - ${track.title} (${track.album.title})`;
  });

  return lines.join("\n");
}

/**
 * Renders a channel's headline pattern (placeholders {headline}/{episode}/{artists}),
 * where {artists} is that same channel's already-formatted track-listing text —
 * the headline pattern just wraps it into the full, ready-to-post caption.
 */
export function buildHeadlineFragment(
  artistsText: string,
  episode: EpisodeForOutput,
  channel: OutputChannel,
): string {
  return channel.headlinePattern
    .replaceAll("{headline}", episode.headline)
    .replaceAll("{episode}", formatEpisodeNumber(episode))
    .replaceAll("{artists}", artistsText);
}

export function buildHtmlFragment(entries: PlaylistEntryForOutput[]): string {
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  const items = sorted.map(({ track }) => {
    const contributors = buildContributorsHtml(track.contributors);
    const album = buildLinkedHtml(track.album.title, track.album.link);
    return `<li>${contributors} - ${escapeHtml(track.title)} (${album})</li>`;
  });

  return `<ul>\n${items.map((item) => `  ${item}`).join("\n")}\n</ul>`;
}

const JSON_ROLES: Record<ContributorRole, string> = {
  ORIGINAL: "original",
  FEATURING: "featuring",
  REMIX: "remix",
};

const JSON_ROLE_ORDER: ContributorRole[] = ["ORIGINAL", "FEATURING", "REMIX"];

/**
 * Renders the playlist as the JSON the syndae tracklist import reads
 * (docs/IMPORT-TRACKLIST.md, "Format 2"). Artists are listed in the same
 * order `formatContributorList` joins them (original, featuring, remix, each
 * by position). Optional keys without a value (artist `url`, `albumUrl`) are
 * omitted; `label` is "" when the album has none, as in the example file.
 */
export function buildTracklistJson(entries: PlaylistEntryForOutput[]): string {
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  const tracks = sorted.map(({ track }) => ({
    artists: JSON_ROLE_ORDER.flatMap((role) =>
      track.contributors
        .filter((c) => c.role === role)
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          name: c.artist.name,
          role: JSON_ROLES[role],
          ...(c.artist.websiteUrl ? { url: c.artist.websiteUrl } : {}),
        })),
    ),
    title: track.title,
    album: track.album.title,
    ...(track.album.link ? { albumUrl: track.album.link } : {}),
    label: track.album.label?.name ?? "",
  }));

  return JSON.stringify({ version: 1, tracks }, null, 2);
}

/**
 * Renders a track's contributors as the "<Künstler°>" HTML fragment (each
 * name individually linked to its artist's websiteUrl, if any). Shared
 * between the HTML preview output and the Setlisten overview table.
 */
export function buildContributorsHtml(contributors: ContributorForOutput[]): string {
  return formatContributorList(
    contributors.map((c) => ({
      name: linkedName(escapeHtml(c.artist.name), c.artist.websiteUrl),
      role: c.role,
      position: c.position,
    })),
  );
}

/** Renders `text` as an HTML-escaped `<a>` if `url` is set, plain text otherwise. */
export function buildLinkedHtml(text: string, url: string | null): string {
  return linkedName(escapeHtml(text), url);
}

/**
 * Renders a channel's own pattern (placeholders {artists}/{track}/{album})
 * for each playlist entry and joins them with ", " — the pattern itself now
 * carries what used to be a hardcoded "with/without album" choice.
 *
 * A pattern that omits a placeholder (e.g. "{artists}" without "{track}")
 * can render the same text for multiple distinct playlist entries — the
 * same artist twice, or the same artist/album combination from different
 * tracks. Those duplicates are filtered out (first occurrence wins) since
 * repeating the identical rendered text serves no purpose in the post.
 */
export function buildTextFragment(entries: PlaylistEntryForOutput[], channel: OutputChannel): string {
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  const parts = sorted.map(({ track }) => {
    const contributors = formatContributorList(
      track.contributors.map((c) => ({
        name: referenceNameForChannel(c.artist, channel.id),
        role: c.role,
        position: c.position,
      })),
    );
    return applyPattern(channel.pattern, {
      artists: contributors,
      track: track.title,
      album: track.album.title,
    });
  });

  return [...new Set(parts)].join(", ");
}

function referenceNameForChannel(artist: ArtistForOutput, channelId: number): string {
  const match = artist.socialReferences.find((ref) => ref.channelId === channelId);
  if (!match) return artist.name;
  // "@" is the conventional prefix for a social handle; normalize here so it
  // doesn't matter whether it was typed in when the reference was entered.
  return match.referenceName.startsWith("@") ? match.referenceName : `@${match.referenceName}`;
}

function applyPattern(
  pattern: string,
  values: { artists: string; track: string; album: string },
): string {
  return pattern
    .replaceAll("{artists}", values.artists)
    .replaceAll("{track}", values.track)
    .replaceAll("{album}", values.album);
}

function linkedName(escapedName: string, url: string | null): string {
  return url ? `<a href="${escapeHtmlAttribute(url)}">${escapedName}</a>` : escapedName;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}
