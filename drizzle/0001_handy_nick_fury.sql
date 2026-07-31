CREATE TABLE `audit_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`external_lead_id` text NOT NULL,
	`website_url` text NOT NULL,
	`normalized_url` text NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`status` text NOT NULL,
	`public_token` text NOT NULL,
	`score` integer,
	`result_json` text,
	`error_code` text,
	`callback_status` text DEFAULT 'pending' NOT NULL,
	`callback_attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`started_at` text,
	`updated_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_jobs_idempotency_key_uidx` ON `audit_jobs` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `audit_jobs_public_token_uidx` ON `audit_jobs` (`public_token`);--> statement-breakpoint
CREATE INDEX `audit_jobs_external_lead_id_idx` ON `audit_jobs` (`external_lead_id`);--> statement-breakpoint
CREATE INDEX `audit_jobs_status_idx` ON `audit_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `audit_jobs_created_at_idx` ON `audit_jobs` (`created_at`);--> statement-breakpoint
CREATE TABLE `audit_service_events` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audit_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_service_events_audit_id_idx` ON `audit_service_events` (`audit_id`);--> statement-breakpoint
CREATE INDEX `audit_service_events_occurred_at_idx` ON `audit_service_events` (`occurred_at`);