CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_events_audit_id_idx` ON `audit_events` (`audit_id`);--> statement-breakpoint
CREATE INDEX `audit_events_occurred_at_idx` ON `audit_events` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `audits` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`public_token` text NOT NULL,
	`normalized_url` text NOT NULL,
	`status` text NOT NULL,
	`score` integer,
	`result_json` text,
	`error_code` text,
	`created_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audits_public_token_uidx` ON `audits` (`public_token`);--> statement-breakpoint
CREATE INDEX `audits_lead_id_idx` ON `audits` (`lead_id`);--> statement-breakpoint
CREATE INDEX `audits_status_idx` ON `audits` (`status`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_name` text NOT NULL,
	`email` text NOT NULL,
	`mobile` text NOT NULL,
	`website_url` text NOT NULL,
	`audit_consent_at` text NOT NULL,
	`marketing_consent_at` text,
	`attribution_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);--> statement-breakpoint
CREATE INDEX `leads_created_at_idx` ON `leads` (`created_at`);