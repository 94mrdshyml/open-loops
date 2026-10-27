ALTER TABLE "authors" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_slug_unique" UNIQUE("slug");