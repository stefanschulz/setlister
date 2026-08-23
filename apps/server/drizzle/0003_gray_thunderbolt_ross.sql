DROP INDEX `episodes_number_unique`;--> statement-breakpoint
ALTER TABLE `episodes` ADD `suffix` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_number_suffix_unique` ON `episodes` (`number`,`suffix`);