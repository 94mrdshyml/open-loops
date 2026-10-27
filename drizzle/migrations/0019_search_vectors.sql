-- Better search. First the two database tools it needs (both are on Neon's list of trusted
-- extensions): unaccent, so "El Nino" finds "El Niño", and fuzzystrmatch, which measures how far
-- apart two spellings are (used to fix typos). Then two small helper functions, marked IMMUTABLE
-- (the same answer for the same input) because Postgres only allows those in a generated column.
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;--> statement-breakpoint
CREATE OR REPLACE FUNCTION search_unaccent(input text) RETURNS text
	LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
	AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, input) $$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION search_array_text(input text[]) RETURNS text
	LANGUAGE sql IMMUTABLE PARALLEL SAFE
	AS $$ SELECT coalesce(array_to_string(input, ' '), '') $$;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "search_body" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (
			setweight(to_tsvector('english', search_unaccent(coalesce("posts"."title", ''))), 'A') ||
			setweight(to_tsvector('english', search_unaccent(coalesce("posts"."subtitle", ''))), 'B') ||
			setweight(to_tsvector('english', search_unaccent(coalesce("posts"."excerpt", '') || ' ' || search_array_text("posts"."tldr"))), 'C') ||
			setweight(to_tsvector('english', search_unaccent(coalesce("posts"."search_body", ''))), 'D')) STORED;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "search_words" "tsvector" GENERATED ALWAYS AS (
			to_tsvector('simple', search_unaccent(
				coalesce("posts"."title", '') || ' ' || coalesce("posts"."subtitle", '') || ' ' ||
				coalesce("posts"."excerpt", '') || ' ' || search_array_text("posts"."tldr") || ' ' ||
				coalesce("posts"."search_body", '')))) STORED;