CREATE TABLE "email_sends" (
	"id" text PRIMARY KEY NOT NULL,
	"resend_email_id" text,
	"type" text NOT NULL,
	"to_email" text NOT NULL,
	"user_id" text,
	"subject" text NOT NULL,
	"last_event" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
