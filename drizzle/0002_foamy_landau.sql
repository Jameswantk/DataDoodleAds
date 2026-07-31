CREATE TABLE `audit_result_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`normalized_url` text NOT NULL,
	`content_fingerprint` text NOT NULL,
	`analysis_key` text NOT NULL,
	`result_json` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_result_cache_lookup_idx` ON `audit_result_cache` (`normalized_url`,`content_fingerprint`,`analysis_key`);--> statement-breakpoint
CREATE INDEX `audit_result_cache_expires_at_idx` ON `audit_result_cache` (`expires_at`);