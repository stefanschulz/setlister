import { relations } from "drizzle-orm";
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const CONTRIBUTOR_ROLES = ["ORIGINAL", "FEATURING", "REMIX"] as const;
export type ContributorRole = (typeof CONTRIBUTOR_ROLES)[number];

export const artists = sqliteTable("artists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  realName: text("real_name"),
  websiteUrl: text("website_url"),
});

// User-managed, not a fixed enum: docs/konzept.md §1.3 requires the platform
// list to stay extensible, and each channel also carries its own output
// pattern (placeholders {artists}/{track}/{album}) for text-fragment output,
// plus a headline pattern (placeholders {headline}/{episode}/{artists}) for
// the full, ready-to-post caption text.
export const outputChannels = sqliteTable("output_channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  pattern: text("pattern").notNull(),
  headlinePattern: text("headline_pattern").notNull().default(""),
});

export const artistSocialReferences = sqliteTable("artist_social_references", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  artistId: integer("artist_id")
    .notNull()
    .references(() => artists.id),
  channelId: integer("channel_id")
    .notNull()
    .references(() => outputChannels.id),
  referenceName: text("reference_name").notNull(),
});

export const albums = sqliteTable("albums", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  link: text("link"),
});

export const tracks = sqliteTable("tracks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  albumId: integer("album_id")
    .notNull()
    .references(() => albums.id),
});

export const trackContributors = sqliteTable("track_contributors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackId: integer("track_id")
    .notNull()
    .references(() => tracks.id),
  artistId: integer("artist_id")
    .notNull()
    .references(() => artists.id),
  role: text("role", { enum: CONTRIBUTOR_ROLES }).notNull(),
  // Order within this track+role group, used by the output formatting rule
  // (docs/konzept.md §1.7) to render "A, B & C" / "A feat. B" / "A vs B".
  position: integer("position").notNull(),
});

export const episodes = sqliteTable("episodes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: integer("number").notNull(),
  // Free-text addition for irregular episode identifiers (e.g. "v1", " (xe)");
  // "" (not null) so the uniqueness check below also catches plain-number
  // duplicates — SQLite treats every NULL as distinct, even from another NULL.
  suffix: text("suffix").notNull().default(""),
  headline: text("headline").notNull(),
  topic: text("topic").notNull(),
  // ISO date string (YYYY-MM-DD). Null = draft, set = published (see §1.1).
  airDate: text("air_date"),
}, (table) => [unique().on(table.number, table.suffix)]);

export const episodePlaylistEntries = sqliteTable("episode_playlist_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  episodeId: integer("episode_id")
    .notNull()
    .references(() => episodes.id),
  trackId: integer("track_id")
    .notNull()
    .references(() => tracks.id),
  // Playback order within the episode (§1.2: manual, matches actual air order).
  position: integer("position").notNull(),
});

export const artistsRelations = relations(artists, ({ many }) => ({
  socialReferences: many(artistSocialReferences),
  trackContributions: many(trackContributors),
}));

export const artistSocialReferencesRelations = relations(artistSocialReferences, ({ one }) => ({
  artist: one(artists, {
    fields: [artistSocialReferences.artistId],
    references: [artists.id],
  }),
  channel: one(outputChannels, {
    fields: [artistSocialReferences.channelId],
    references: [outputChannels.id],
  }),
}));

export const outputChannelsRelations = relations(outputChannels, ({ many }) => ({
  socialReferences: many(artistSocialReferences),
}));

export const albumsRelations = relations(albums, ({ many }) => ({
  tracks: many(tracks),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  album: one(albums, {
    fields: [tracks.albumId],
    references: [albums.id],
  }),
  contributors: many(trackContributors),
  playlistEntries: many(episodePlaylistEntries),
}));

export const trackContributorsRelations = relations(trackContributors, ({ one }) => ({
  track: one(tracks, {
    fields: [trackContributors.trackId],
    references: [tracks.id],
  }),
  artist: one(artists, {
    fields: [trackContributors.artistId],
    references: [artists.id],
  }),
}));

export const episodesRelations = relations(episodes, ({ many }) => ({
  playlistEntries: many(episodePlaylistEntries),
}));

export const episodePlaylistEntriesRelations = relations(episodePlaylistEntries, ({ one }) => ({
  episode: one(episodes, {
    fields: [episodePlaylistEntries.episodeId],
    references: [episodes.id],
  }),
  track: one(tracks, {
    fields: [episodePlaylistEntries.trackId],
    references: [tracks.id],
  }),
}));
