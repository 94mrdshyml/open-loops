import { defineConfig } from 'drizzle-kit';

const migrationUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!migrationUrl) throw new Error('DIRECT_DATABASE_URL or DATABASE_URL must be set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle/migrations',
	dialect: 'postgresql',
	dbCredentials: { url: migrationUrl },
	verbose: true,
	strict: true
});
