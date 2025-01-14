DROP INDEX `source_unq_idx`;--> statement-breakpoint
ALTER TABLE `reports` ADD `uri` text(2048);--> statement-breakpoint
CREATE UNIQUE INDEX `reports_uri_unique` ON `reports` (`uri`);--> statement-breakpoint
CREATE UNIQUE INDEX `uri_unq_idx` ON `reports` (`uri`);--> statement-breakpoint
ALTER TABLE `reports` DROP COLUMN `sourceId`;--> statement-breakpoint
ALTER TABLE `reports` DROP COLUMN `message`;