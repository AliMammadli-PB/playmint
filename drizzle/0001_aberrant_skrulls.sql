CREATE TABLE "ad_events" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"play_session_id" text NOT NULL,
	"placement" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_event_id" text,
	"net_cents" integer DEFAULT 0 NOT NULL,
	"developer_cents" integer DEFAULT 0 NOT NULL,
	"platform_cents" integer DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	CONSTRAINT "ad_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "subscription_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "subscription_currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "subscription_benefits" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "rewarded_ads" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "game_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_play_session_id_play_sessions_id_fk" FOREIGN KEY ("play_session_id") REFERENCES "public"."play_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;