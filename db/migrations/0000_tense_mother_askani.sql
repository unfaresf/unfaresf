CREATE TABLE `credentials` (
	`user_id` integer NOT NULL,
	`id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer NOT NULL,
	`backed_up` integer NOT NULL,
	`transports` text NOT NULL,
	PRIMARY KEY(`id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credentials_id_unique` ON `credentials` (`id`);--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`sourceId` text NOT NULL,
	`source` text(64) NOT NULL,
	`message` text(1024) NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`reviewed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_unq_idx` ON `reports` (`source`,`sourceId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text(64) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);