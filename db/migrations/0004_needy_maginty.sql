PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`sourceId` text NOT NULL,
	`source` text(64) NOT NULL,
	`message` text(1024),
	`reviewed_at` integer,
	`route` text(512),
	`stop` text(512),
	`direction` text(512),
	`passenger` integer
);
--> statement-breakpoint
INSERT INTO `__new_reports`("id", "created_at", "sourceId", "source", "message", "reviewed_at", "route", "stop", "direction", "passenger") SELECT "id", "created_at", "sourceId", "source", "message", "reviewed_at", "route", "stop", "direction", "passenger" FROM `reports`;--> statement-breakpoint
DROP TABLE `reports`;--> statement-breakpoint
ALTER TABLE `__new_reports` RENAME TO `reports`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `source_unq_idx` ON `reports` (`source`,`sourceId`);