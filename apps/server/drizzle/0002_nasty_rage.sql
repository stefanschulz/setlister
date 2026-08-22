PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_artist_social_references` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`artist_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`reference_name` text NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `output_channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_artist_social_references`("id", "artist_id", "channel_id", "reference_name") SELECT "id", "artist_id", "channel_id", "reference_name" FROM `artist_social_references`;--> statement-breakpoint
DROP TABLE `artist_social_references`;--> statement-breakpoint
ALTER TABLE `__new_artist_social_references` RENAME TO `artist_social_references`;--> statement-breakpoint
PRAGMA foreign_keys=ON;