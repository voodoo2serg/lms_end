ALTER TABLE `leads` ADD `contact_type` text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `contact` text DEFAULT '' NOT NULL;