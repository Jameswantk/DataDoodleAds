import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Legacy MVP tables are intentionally retained in the schema so the scope
 * correction does not generate a destructive migration. New code never writes
 * contact data to these tables. They can be removed in a separately approved
 * data-retention migration.
 */
export const legacyLeads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    contactName: text("contact_name").notNull(),
    email: text("email").notNull(),
    mobile: text("mobile").notNull(),
    websiteUrl: text("website_url").notNull(),
    auditConsentAt: text("audit_consent_at").notNull(),
    marketingConsentAt: text("marketing_consent_at"),
    attributionJson: text("attribution_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("leads_email_idx").on(table.email),
    index("leads_created_at_idx").on(table.createdAt),
  ],
);

export const legacyAudits = sqliteTable(
  "audits",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => legacyLeads.id),
    publicToken: text("public_token").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    status: text("status").notNull(),
    score: integer("score"),
    resultJson: text("result_json"),
    errorCode: text("error_code"),
    createdAt: text("created_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("audits_public_token_uidx").on(table.publicToken),
    index("audits_lead_id_idx").on(table.leadId),
    index("audits_status_idx").on(table.status),
  ],
);

export const legacyAuditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => legacyAudits.id),
    eventType: text("event_type").notNull(),
    payloadJson: text("payload_json").notNull().default("{}"),
    occurredAt: text("occurred_at").notNull(),
  },
  (table) => [
    index("audit_events_audit_id_idx").on(table.auditId),
    index("audit_events_occurred_at_idx").on(table.occurredAt),
  ],
);

export const auditJobs = sqliteTable(
  "audit_jobs",
  {
    id: text("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    externalLeadId: text("external_lead_id").notNull(),
    websiteUrl: text("website_url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    locale: text("locale").notNull().default("en"),
    status: text("status").notNull(),
    publicToken: text("public_token").notNull(),
    score: integer("score"),
    resultJson: text("result_json"),
    errorCode: text("error_code"),
    callbackStatus: text("callback_status").notNull().default("pending"),
    callbackAttempts: integer("callback_attempts").notNull().default(0),
    createdAt: text("created_at").notNull(),
    startedAt: text("started_at"),
    updatedAt: text("updated_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("audit_jobs_idempotency_key_uidx").on(table.idempotencyKey),
    uniqueIndex("audit_jobs_public_token_uidx").on(table.publicToken),
    index("audit_jobs_external_lead_id_idx").on(table.externalLeadId),
    index("audit_jobs_status_idx").on(table.status),
    index("audit_jobs_created_at_idx").on(table.createdAt),
  ],
);

export const auditServiceEvents = sqliteTable(
  "audit_service_events",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => auditJobs.id),
    eventType: text("event_type").notNull(),
    payloadJson: text("payload_json").notNull().default("{}"),
    occurredAt: text("occurred_at").notNull(),
  },
  (table) => [
    index("audit_service_events_audit_id_idx").on(table.auditId),
    index("audit_service_events_occurred_at_idx").on(table.occurredAt),
  ],
);

export const auditResultCache = sqliteTable(
  "audit_result_cache",
  {
    cacheKey: text("cache_key").primaryKey(),
    normalizedUrl: text("normalized_url").notNull(),
    contentFingerprint: text("content_fingerprint").notNull(),
    analysisKey: text("analysis_key").notNull(),
    resultJson: text("result_json").notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [
    index("audit_result_cache_lookup_idx").on(
      table.normalizedUrl,
      table.contentFingerprint,
      table.analysisKey,
    ),
    index("audit_result_cache_expires_at_idx").on(table.expiresAt),
  ],
);
