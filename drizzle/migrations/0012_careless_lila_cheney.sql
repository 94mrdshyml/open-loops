CREATE TABLE IF NOT EXISTS "bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"post_slug" text NOT NULL,
	"post_title" text NOT NULL,
	"cover_image_url" text,
	"saved_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_post_slug_unique" UNIQUE("user_id","post_slug")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
