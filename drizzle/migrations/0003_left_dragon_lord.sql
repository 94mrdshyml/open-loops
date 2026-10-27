ALTER TABLE "authors" DROP CONSTRAINT "authors_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "authors" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "role" text DEFAULT 'writer' NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;