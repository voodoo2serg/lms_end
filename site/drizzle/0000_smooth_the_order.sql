CREATE TABLE `attendance` (
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `event_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_content` (
	`id` text PRIMARY KEY NOT NULL,
	`json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`kind` text NOT NULL,
	`service` text NOT NULL,
	`message` text NOT NULL,
	`consent` text NOT NULL,
	`ads_consent` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`purchased` text NOT NULL,
	PRIMARY KEY(`user_id`, `course_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `saved` (
	`user_id` text NOT NULL,
	`material_id` text NOT NULL,
	`done` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `material_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`about` text DEFAULT '' NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`club` integer DEFAULT 0 NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`avatar` text,
	`created` text NOT NULL,
	`consent` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);