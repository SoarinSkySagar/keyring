import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";

// ── Auth.js required tables ─────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"), // required by @auth/drizzle-adapter; always null for email/MetaMask signups
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"), // null for Google / MetaMask users
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  // API key for agent connections — only the SHA-256 hash is stored
  apiKeyHash: text("api_key_hash").unique(),
  // Rate limit settings (requests per window, configurable by user)
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60).notNull(),
  rateLimitPerHour: integer("rate_limit_per_hour").default(1000).notNull(),
  rateLimitPerDay: integer("rate_limit_per_day").default(10000).notNull(),
});

// Stores OAuth + custom credential account links.
// provider values: "credentials" | "google" | "metamask"
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ── Email OTP codes ─────────────────────────────────────────────
// passwordHash is populated on signup; absent on login.

export const otpCodes = pgTable("otp_codes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  code: text("code").notNull(),
  passwordHash: text("password_hash"), // set during sign-up flow
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// ── SIWE nonces (MetaMask sign-in) ──────────────────────────────

export const siweNonces = pgTable("siwe_nonces", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  address: text("address").notNull(), // lowercase hex
  nonce: text("nonce").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// ── Keyring domain tables ───────────────────────────────────────

export const grants = pgTable("grants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  grantRef: text("grant_ref").notNull(),
  agentAddress: text("agent_address").notNull(),
  operations: text("operations").array().notNull().default([]),
  budgetTotal: integer("budget_total").notNull().default(0),
  budgetUsed: integer("budget_used").notNull().default(0),
  revoked: boolean("revoked").notNull().default(false),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  grantId: text("grant_id").references(() => grants.id, { onDelete: "set null" }),
  requestId: text("request_id").notNull(),
  agentAddress: text("agent_address").notNull(),
  operation: text("operation").notNull(),
  resourceId: text("resource_id").notNull(),
  status: text("status").notNull(),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// ── Whitelisted agents ───────────────────────────────────────────

export const agents = pgTable("agents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  agentKey: text("agent_key").notNull().unique(), // plaintext — viewable any time
  allowedSecrets: text("allowed_secrets").array().notNull().default([]),
  policy: text("policy").notNull().default(""),
  status: text("status").notNull().default("active"), // "active" | "inactive"
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ── API call log ─────────────────────────────────────────────────
// One row per request that passes authentication at /api/[apiKey].

export const apiCalls = pgTable("api_calls", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  agentId: text("agent_id")
    .references(() => agents.id, { onDelete: "set null" }), // null for GET/unauthenticated
  path: text("path").notNull().default(""),
  method: text("method").notNull().default("GET"),
  status: integer("status").notNull().default(200),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ── Types ───────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Grant = typeof grants.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type ApiCall = typeof apiCalls.$inferSelect;
export type Agent = typeof agents.$inferSelect;
// name is intentionally omitted from the schema — we identify users by email only
