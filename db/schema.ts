import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const leads = sqliteTable(
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

export const audits = sqliteTable(
  "audits",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id),
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

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => audits.id),
    eventType: text("event_type").notNull(),
    payloadJson: text("payload_json").notNull().default("{}"),
    occurredAt: text("occurred_at").notNull(),
  },
  (table) => [
    index("audit_events_audit_id_idx").on(table.auditId),
    index("audit_events_occurred_at_idx").on(table.occurredAt),
  ],
);
