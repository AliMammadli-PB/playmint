CREATE TYPE "public"."game_status" AS ENUM('draft', 'published', 'unlisted', 'removed');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('requested', 'paid', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('draft', 'final');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('player', 'developer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."sub_status" AS ENUM('active', 'canceled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."version_status" AS ENUM('pending', 'approved', 'rejected', 'superseded');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target" text DEFAULT '' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_game_players" (
	"game_id" text NOT NULL,
	"day" date NOT NULL,
	"player_key" text NOT NULL,
	CONSTRAINT "daily_game_players_game_id_day_player_key_pk" PRIMARY KEY("game_id","day","player_key")
);
--> statement-breakpoint
CREATE TABLE "daily_game_stats" (
	"game_id" text NOT NULL,
	"day" date NOT NULL,
	"plays" integer DEFAULT 0 NOT NULL,
	"unique_players" integer DEFAULT 0 NOT NULL,
	"seconds" bigint DEFAULT 0 NOT NULL,
	"premium_seconds" bigint DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_game_stats_game_id_day_pk" PRIMARY KEY("game_id","day")
);
--> statement-breakpoint
CREATE TABLE "developer_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"payout_method" text DEFAULT '' NOT NULL,
	"payout_details" text DEFAULT '' NOT NULL,
	"payout_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "earnings" (
	"month" text NOT NULL,
	"game_id" text NOT NULL,
	"developer_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"premium_seconds" bigint NOT NULL,
	"paying_players" integer NOT NULL,
	CONSTRAINT "earnings_month_game_id_pk" PRIMARY KEY("month","game_id")
);
--> statement-breakpoint
CREATE TABLE "game_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"number" integer NOT NULL,
	"status" "version_status" DEFAULT 'pending' NOT NULL,
	"changelog" text DEFAULT '' NOT NULL,
	"source_zip_path" text NOT NULL,
	"files_dir" text NOT NULL,
	"entry" text DEFAULT 'index.html' NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"report" jsonb NOT NULL,
	"review_note" text DEFAULT '' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"developer_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"tagline" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"description" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"category" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"license" text NOT NULL,
	"orientation" text DEFAULT 'landscape' NOT NULL,
	"cover_path" text,
	"premium_only" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "game_status" DEFAULT 'draft' NOT NULL,
	"live_version_id" text,
	"like_count" integer DEFAULT 0 NOT NULL,
	"play_count" integer DEFAULT 0 NOT NULL,
	"play_seconds" bigint DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "likes_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" text,
	"provider" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"fee_cents" integer DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"test" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"developer_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"method" text NOT NULL,
	"details" text NOT NULL,
	"status" "payout_status" DEFAULT 'requested' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text,
	"visitor_id" text NOT NULL,
	"premium" boolean DEFAULT false NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"last_beat_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_periods" (
	"month" text PRIMARY KEY NOT NULL,
	"status" "period_status" DEFAULT 'draft' NOT NULL,
	"gross_cents" integer NOT NULL,
	"net_cents" integer NOT NULL,
	"dev_share_bps" integer NOT NULL,
	"pool_cents" integer NOT NULL,
	"platform_cents" integer NOT NULL,
	"subscriber_count" integer NOT NULL,
	"currency" text NOT NULL,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text DEFAULT '' NOT NULL,
	"status" "sub_status" DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_game_daily" (
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"day" date NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"premium_seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_game_daily_user_id_game_id_day_pk" PRIMARY KEY("user_id","game_id","day")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "role" DEFAULT 'player' NOT NULL,
	"locale" text DEFAULT 'tr' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_game_players" ADD CONSTRAINT "daily_game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_game_stats" ADD CONSTRAINT "daily_game_stats_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_profiles" ADD CONSTRAINT "developer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_month_revenue_periods_month_fk" FOREIGN KEY ("month") REFERENCES "public"."revenue_periods"("month") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_developer_id_users_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_versions" ADD CONSTRAINT "game_versions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_developer_id_users_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_developer_id_users_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_game_daily" ADD CONSTRAINT "user_game_daily_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_game_daily" ADD CONSTRAINT "user_game_daily_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dev_handle_uq" ON "developer_profiles" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "earnings_dev_idx" ON "earnings" USING btree ("developer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "versions_game_number_uq" ON "game_versions" USING btree ("game_id","number");--> statement-breakpoint
CREATE INDEX "versions_status_idx" ON "game_versions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "games_slug_uq" ON "games" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "games_dev_idx" ON "games" USING btree ("developer_id");--> statement-breakpoint
CREATE INDEX "games_status_idx" ON "games" USING btree ("status");--> statement-breakpoint
CREATE INDEX "likes_game_idx" ON "likes" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "payments_paid_idx" ON "payments" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "payouts_dev_idx" ON "payouts" USING btree ("developer_id");--> statement-breakpoint
CREATE INDEX "play_sessions_game_idx" ON "play_sessions" USING btree ("game_id","started_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subs_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ugd_day_idx" ON "user_game_daily" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");