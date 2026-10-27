ALTER TABLE "user" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'reader' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");--> statement-breakpoint
CREATE TABLE "read_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"post_slug" text NOT NULL,
	"post_title" text NOT NULL,
	"cover_image_url" text,
	"read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "read_history_user_id_post_slug_unique" UNIQUE("user_id","post_slug")
);
--> statement-breakpoint
ALTER TABLE "read_history" ADD CONSTRAINT "read_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
