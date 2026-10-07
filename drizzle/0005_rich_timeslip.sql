CREATE TABLE "ad_allocations" (
	"settlement_id" text NOT NULL,
	"game_id" text NOT NULL,
	"developer_id" text NOT NULL,
	"reported_minor" integer NOT NULL,
	"developer_cents" integer NOT NULL,
	"platform_cents" integer NOT NULL,
	CONSTRAINT "ad_allocations_settlement_id_game_id_pk" PRIMARY KEY("settlement_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "ad_settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"period" text NOT NULL,
	"bank_reference" text NOT NULL,
	"net_try_cents" integer NOT NULL,
	"report_currency" text NOT NULL,
	"report_csv" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"bank_received_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ad_settlements_bank_reference_unique" UNIQUE("bank_reference")
);
--> statement-breakpoint
CREATE TABLE "game_ad_settings" (
	"game_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"startup" boolean DEFAULT true NOT NULL,
	"midgame" boolean DEFAULT false NOT NULL,
	"rewarded" boolean DEFAULT false NOT NULL,
	"interval_seconds" integer DEFAULT 300 NOT NULL,
	"channel_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_ad_settings_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
ALTER TABLE "ad_allocations" ADD CONSTRAINT "ad_allocations_settlement_id_ad_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."ad_settlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_allocations" ADD CONSTRAINT "ad_allocations_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_allocations" ADD CONSTRAINT "ad_allocations_developer_id_users_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_ad_settings" ADD CONSTRAINT "game_ad_settings_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;