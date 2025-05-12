PRAGMA foreign_keys=OFF;--> statement-breakpoint
UPDATE `broadcasts` SET platforms = '' WHERE platforms is NULL;--> statement-breakpoint
CREATE TABLE `__new_broadcasts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`message` text(1024) NOT NULL,
	`platforms` text DEFAULT '' NOT NULL,
	`report_id` integer,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_broadcasts`("id", "created_at", "message", "platforms", "report_id") SELECT "id", "created_at", "message", "platforms", "report_id" FROM `broadcasts`;--> statement-breakpoint
DROP TABLE `broadcasts`;--> statement-breakpoint
ALTER TABLE `__new_broadcasts` RENAME TO `broadcasts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `broadcasts_report_id_unique` ON `broadcasts` (`report_id`);