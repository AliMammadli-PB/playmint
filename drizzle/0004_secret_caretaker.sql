ALTER TABLE "game_versions" ADD COLUMN "project_dir" text;--> statement-breakpoint
ALTER TABLE "game_versions" ADD COLUMN "runtime_kind" text DEFAULT 'browser' NOT NULL;