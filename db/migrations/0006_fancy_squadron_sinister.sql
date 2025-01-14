DROP INDEX `uri_unq_idx`;--> statement-breakpoint
CREATE INDEX `source_idx` ON `reports` (`source`);--> statement-breakpoint
CREATE INDEX `reviewed_at_idx` ON `reports` (`reviewed_at`);