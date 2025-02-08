ALTER TABLE `broadcasts` ADD `report_id` integer REFERENCES reports(id);--> statement-breakpoint
CREATE UNIQUE INDEX `broadcasts_report_id_unique` ON `broadcasts` (`report_id`);