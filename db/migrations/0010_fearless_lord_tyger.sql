PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`source` text(64) NOT NULL,
	`uri` text(2048),
	`reviewed_at` integer,
	`route` text,
	`stop` text,
	`direction` text,
	`passenger` integer,
	`message` text(1000)
);
--> statement-breakpoint
INSERT INTO `__new_reports`("id", "created_at", "source", "uri", "reviewed_at", "route", "stop", "direction", "passenger") SELECT "id", "created_at", "source", "uri", "reviewed_at", "route", "stop", "direction", "passenger" FROM `reports`;--> statement-breakpoint
DROP TABLE `reports`;--> statement-breakpoint
ALTER TABLE `__new_reports` RENAME TO `reports`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `reports_uri_unique` ON `reports` (`uri`);--> statement-breakpoint
CREATE INDEX `source_idx` ON `reports` (`source`);--> statement-breakpoint
CREATE INDEX `reviewed_at_idx` ON `reports` (`reviewed_at`);