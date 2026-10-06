import {
  pgTable,
  pgEnum,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  date,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  serial,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["player", "developer", "admin"]);
export const gameStatusEnum = pgEnum("game_status", ["draft", "published", "unlisted", "removed"]);
export const versionStatusEnum = pgEnum("version_status", ["pending", "approved", "rejected", "superseded"]);
export const subStatusEnum = pgEnum("sub_status", ["active", "canceled", "expired"]);
export const periodStatusEnum = pgEnum("period_status", ["draft", "final"]);
export const payoutStatusEnum = pgEnum("payout_status", ["requested", "paid", "rejected"]);

const id = () => text("id").primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: roleEnum("role").notNull().default("player"),
    locale: text("locale").notNull().default("tr"),
    banned: boolean("banned").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const developerProfiles = pgTable(
  "developer_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    website: text("website").notNull().default(""),
    payoutMethod: text("payout_method").notNull().default(""), // iban | paypal | wise
    payoutDetails: text("payout_details").notNull().default(""),
    payoutName: text("payout_name").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("dev_handle_uq").on(t.handle)],
);

/** Localised text: { tr?: string, az?: string, en?: string } */
export type I18nText = Partial<Record<"tr" | "az" | "en", string>>;

export const games = pgTable(
  "games",
  {
    id: id(),
    developerId: text("developer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    tagline: jsonb("tagline").$type<I18nText>().notNull().default({}),
    description: jsonb("description").$type<I18nText>().notNull().default({}),
    category: text("category").notNull(),
    tags: text("tags").array().notNull().default([]),
    license: text("license").notNull(),
    orientation: text("orientation").notNull().default("landscape"), // landscape | portrait | any
    coverPath: text("cover_path"),
    premiumOnly: boolean("premium_only").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    status: gameStatusEnum("status").notNull().default("draft"),
    liveVersionId: text("live_version_id"),
    likeCount: integer("like_count").notNull().default(0),
    playCount: integer("play_count").notNull().default(0),
    playSeconds: bigint("play_seconds", { mode: "number" }).notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("games_slug_uq").on(t.slug),
    index("games_dev_idx").on(t.developerId),
    index("games_status_idx").on(t.status),
  ],
);

export type ScanReport = {
  fileCount: number;
  totalBytes: number;
  entry: string;
  externalHosts: string[];
  warnings: string[];
};

export const gameVersions = pgTable(
  "game_versions",
  {
    id: id(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    status: versionStatusEnum("status").notNull().default("pending"),
    changelog: text("changelog").notNull().default(""),
    sourceZipPath: text("source_zip_path").notNull(),
    filesDir: text("files_dir").notNull(),
    entry: text("entry").notNull().default("index.html"),
    files: jsonb("files").$type<{ path: string; size: number }[]>().notNull().default([]),
    report: jsonb("report").$type<ScanReport>().notNull(),
    reviewNote: text("review_note").notNull().default(""),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("versions_game_number_uq").on(t.gameId, t.number),
    index("versions_status_idx").on(t.status),
  ],
);

export const likes = pgTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gameId] }), index("likes_game_idx").on(t.gameId)],
);

/** One row per opened player. Seconds are only added through validated heartbeats. */
export const playSessions = pgTable(
  "play_sessions",
  {
    id: id(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    visitorId: text("visitor_id").notNull(),
    premium: boolean("premium").notNull().default(false),
    seconds: integer("seconds").notNull().default(0),
    lastBeatAt: timestamp("last_beat_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("play_sessions_game_idx").on(t.gameId, t.startedAt)],
);

export const dailyGameStats = pgTable(
  "daily_game_stats",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    plays: integer("plays").notNull().default(0),
    uniquePlayers: integer("unique_players").notNull().default(0),
    seconds: bigint("seconds", { mode: "number" }).notNull().default(0),
    premiumSeconds: bigint("premium_seconds", { mode: "number" }).notNull().default(0),
    likes: integer("likes").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.day] })],
);

/** Marker table for daily unique players (user id or anonymous visitor id). */
export const dailyGamePlayers = pgTable(
  "daily_game_players",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    playerKey: text("player_key").notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.day, t.playerKey] })],
);

/** Per signed-in user, per game, per day play time — basis of user-centric revenue split. */
export const userGameDaily = pgTable(
  "user_game_daily",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    seconds: integer("seconds").notNull().default(0),
    premiumSeconds: integer("premium_seconds").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gameId, t.day] }), index("ugd_day_idx").on(t.day)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref").notNull().default(""),
    status: subStatusEnum("status").notNull().default("active"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("subs_user_idx").on(t.userId)],
);

/** Money actually collected. amount/fee in cents. */
export const payments = pgTable(
  "payments",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    provider: text("provider").notNull(),
    amountCents: integer("amount_cents").notNull(),
    feeCents: integer("fee_cents").notNull().default(0),
    currency: text("currency").notNull(),
    test: boolean("test").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_paid_idx").on(t.paidAt)],
);

export const revenuePeriods = pgTable("revenue_periods", {
  month: text("month").primaryKey(), // YYYY-MM
  status: periodStatusEnum("status").notNull().default("draft"),
  grossCents: integer("gross_cents").notNull(),
  netCents: integer("net_cents").notNull(),
  devShareBps: integer("dev_share_bps").notNull(),
  poolCents: integer("pool_cents").notNull(),
  platformCents: integer("platform_cents").notNull(),
  subscriberCount: integer("subscriber_count").notNull(),
  currency: text("currency").notNull(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const earnings = pgTable(
  "earnings",
  {
    month: text("month")
      .notNull()
      .references(() => revenuePeriods.month, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    developerId: text("developer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    premiumSeconds: bigint("premium_seconds", { mode: "number" }).notNull(),
    payingPlayers: integer("paying_players").notNull(),
  },
  (t) => [primaryKey({ columns: [t.month, t.gameId] }), index("earnings_dev_idx").on(t.developerId)],
);

export const payouts = pgTable(
  "payouts",
  {
    id: id(),
    developerId: text("developer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    method: text("method").notNull(),
    details: text("details").notNull(),
    status: payoutStatusEnum("status").notNull().default("requested"),
    note: text("note").notNull().default(""),
    reference: text("reference").notNull().default(""),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("payouts_dev_idx").on(t.developerId)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  target: text("target").notNull().default(""),
  data: jsonb("data").notNull().default({}),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GameVersion = typeof gameVersions.$inferSelect;
export type DeveloperProfile = typeof developerProfiles.$inferSelect;
