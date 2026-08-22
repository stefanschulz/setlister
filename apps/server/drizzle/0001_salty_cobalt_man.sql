CREATE TABLE `output_channels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pattern` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `output_channels_name_unique` ON `output_channels` (`name`);--> statement-breakpoint
ALTER TABLE `artist_social_references` ADD `channel_id` integer REFERENCES output_channels(id);