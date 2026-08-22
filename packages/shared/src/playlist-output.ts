import { formatContributorList } from "./contributor-format.js";
import type { ContributorRole } from "./contributor-role.js";

export const OUTPUT_CHANNELS = ["Facebook", "Instagram", "Threads", "Bluesky"] as const;
export type OutputChannel = (typeof OUTPUT_CHANNELS)[number];

// docs/konzept.md §1.7: Facebook/Instagram include the album, Threads/Bluesky don't.
const CHANNEL_TEMPLATE: Record<OutputChannel, "withAlbum" | "namesOnly"> = {
  Facebook: "withAlbum",
  Instagram: "withAlbum",
  Threads: "namesOnly",
  Bluesky: "namesOnly",
};

export interface ArtistForOutput {
  name: string;
  websiteUrl: string | null;
  socialReferences: { platform: string; referenceName: string }[];
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
  text: Record<OutputChannel, string>;
}

export function buildAllOutputs(entries: PlaylistEntryForOutput[]): OutputBundle {
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  const text = Object.fromEntries(
    OUTPUT_CHANNELS.map((channel) => [channel, buildTextFragment(sorted, channel)]),
  ) as Record<OutputChannel, string>;

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

export function buildTextFragment(entries: PlaylistEntryForOutput[], channel: OutputChannel): string {
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const template = CHANNEL_TEMPLATE[channel];

  const parts = sorted.map(({ track }) => {
    const contributors = formatContributorList(
      track.contributors.map((c) => ({
        name: referenceNameForChannel(c.artist, channel),
        role: c.role,
        position: c.position,
      })),
    );
    return template === "withAlbum" ? `${contributors} (${track.album.title})` : contributors;
  });

  return parts.join(", ");
}

function referenceNameForChannel(artist: ArtistForOutput, channel: OutputChannel): string {
  const match = artist.socialReferences.find(
    (ref) => ref.platform.trim().toLowerCase() === channel.toLowerCase(),
  );
  return match?.referenceName ?? artist.name;
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
