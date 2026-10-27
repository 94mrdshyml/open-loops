CREATE TABLE "logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"event" text NOT NULL,
	"route" text,
	"method" text,
	"user_id" text,
	"duration_ms" integer,
	"status_code" integer,
	"meta" json,
	"error" text,
	"error_stack" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_logs_timestamp" ON "logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_logs_event" ON "logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "idx_logs_level" ON "logs" USING btree ("level");