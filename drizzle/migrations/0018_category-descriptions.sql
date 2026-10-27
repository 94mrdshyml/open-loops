-- First draft of the one or two line description shown under each category title.
-- Only categories with no description yet are filled in, so nothing written in the dashboard is overwritten.
UPDATE "categories" SET "description" = 'Wars, sanctions, trade routes and power plays, explained through who pays and who profits.', "updated_at" = now() WHERE "slug" = 'geopolitics' AND ("description" IS NULL OR "description" = '');
--> statement-breakpoint
UPDATE "categories" SET "description" = 'Deals, listings, balance sheets and the companies behind them, explained so the numbers make sense.', "updated_at" = now() WHERE "slug" = 'business' AND ("description" IS NULL OR "description" = '');
--> statement-breakpoint
UPDATE "categories" SET "description" = 'The policies, prices and projects shaping India’s economy and everyday life, and what they cost.', "updated_at" = now() WHERE "slug" = 'india' AND ("description" IS NULL OR "description" = '');
--> statement-breakpoint
UPDATE "categories" SET "description" = 'Oil prices, the monsoon, trade and money flows: what moves the economy, in plain words.', "updated_at" = now() WHERE "slug" = 'economy' AND ("description" IS NULL OR "description" = '');
--> statement-breakpoint
UPDATE "categories" SET "description" = 'Engines, submarines, satellites and drones: how India builds its defence, and who pays for it.', "updated_at" = now() WHERE "slug" = 'defence' AND ("description" IS NULL OR "description" = '');
--> statement-breakpoint
UPDATE "categories" SET "description" = 'The models, chips and money behind AI, and what they mean for India and the world.', "updated_at" = now() WHERE "slug" = 'artificial-intelligence' AND ("description" IS NULL OR "description" = '');
--> statement-breakpoint
UPDATE "categories" SET "description" = 'Cables, chips, satellites and breakthroughs, explained through who builds them and who pays.', "updated_at" = now() WHERE "slug" = 'science-tech' AND ("description" IS NULL OR "description" = '');
--> statement-breakpoint
UPDATE "categories" SET "description" = 'India’s young companies, their funding rounds and valuations, and whether the bets add up.', "updated_at" = now() WHERE "slug" = 'startups' AND ("description" IS NULL OR "description" = '');
--> statement-breakpoint
UPDATE "categories" SET "description" = 'Solar, batteries and the minerals behind clean power, and who pays for the shift.', "updated_at" = now() WHERE "slug" = 'renewable-energy' AND ("description" IS NULL OR "description" = '');
