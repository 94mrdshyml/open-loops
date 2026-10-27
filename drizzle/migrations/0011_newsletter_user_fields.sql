ALTER TABLE "user" ADD COLUMN "is_newsletter_subscriber" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "newsletter_subscribed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "newsletter_source" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "resend_contact_id" text;
