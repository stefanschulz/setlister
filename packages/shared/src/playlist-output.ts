import { formatContributorList } from "./contributor-format.js";
import type { ContributorRole } from "./contributor-role.js";
import type { OutputChannel } from "./entities.js";

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
  album: { title: string; link: string | null };
  contributors: ContributorForOutput[];
}

export interface PlaylistEntryForOutput {
  position: number;
  track: TrackForOutput;
}

export interface OutputBundle {
  html: string;
  /** Keyed by OutputChannel.id, since channel names are user-defined and not fixed. */
  text: Record<number, string>;
}

export function buildAllOutputs(
  entries: PlaylistEntryForOutput[],
  channels: OutputChannel[],
): OutputBundle {
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  const text: Record<number, string> = {};
  for (const channel of channels) {
    text[channel.id] = buildTextFragment(sorted, channel);
  }

  return { html: buildHtmlFragment(sorted), text };
}

export function buildHtmlFragment(entries: PlaylistEntryForOutput[]): string {
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  const items = sorted.map(({ track }) => {
    const contributors = formatContributorList(
      track.contributors.map((c) => ({
        name: linkedName(escapeHtml(c.artist.name), c.artist.websiteUrl),
        role: c.role,
        position: c.position,
      })),
    );
    const album = linkedName(escapeHtml(track.album.title), track.album.link);
    return `<li>${contributors} - ${escapeHtml(track.title)} (${album})</li>`;
  });

  return `<ul>\n${items.map((item) => `  ${item}`).join("\n")}\n</ul>`;
}

/**
 * Renders a channel's own pattern (placeholders {artists}/{track}/{album})
 * for each playlist entry and joins them with ", " — the pattern itself now
 * carries what used to be a hardcoded "with/without album" choice.
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

  return parts.join(", ");
}

function referenceNameForChannel(artist: ArtistForOutput, channelId: number): string {
  const match = artist.socialReferences.find((ref) => ref.channelId === channelId);
  return match?.referenceName ?? artist.name;
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
