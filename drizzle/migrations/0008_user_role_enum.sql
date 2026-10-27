CREATE TYPE "public"."user_role" AS ENUM('reader', 'author', 'admin');--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'reader'::"public"."user_role";
