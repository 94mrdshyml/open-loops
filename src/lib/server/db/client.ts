import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

type Db = NeonHttpDatabase<typeof schema>;

let _db: Db | null = null;

function getInstance(): Db {
	if (!_db) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		_db = drizzle(neon(env.DATABASE_URL), { schema });
	}
	return _db;
}

export const db: Db = new Proxy({} as Db, {
	get(_, prop) {
		return getInstance()[prop as keyof Db];
	}
});
