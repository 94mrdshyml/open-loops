ALTER TABLE "categories" ADD COLUMN "show_on_home" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "home_order" integer DEFAULT 0 NOT NULL;