CREATE TABLE `integrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`enable` integer DEFAULT false NOT NULL,
	`options` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integrations_name_unique` ON `integrations` (`name`);