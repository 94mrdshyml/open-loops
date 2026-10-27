import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { rateLimits } from '$lib/server/db/schema';

// Counters live in the database, so they hold across all of Cloudflare's servers and survive
// restarts. A counter is a key (for example `login:someone@example.com`), a count, and the time
// its window started. Once the window has passed, the next hit starts a fresh one.

export interface LimitState {
	/** True when the limit has been reached and the action should be refused. */
	blocked: boolean;
	/** Seconds until the window ends, for the "try again in" message. */
	retryAfterSeconds: number;
}

const OPEN: LimitState = { blocked: false, retryAfterSeconds: 0 };

function stateOf(
	row: { count: number; windowStart: Date } | undefined,
	limit: number,
	windowMs: number
): LimitState {
	if (!row) return OPEN;
	const left = row.windowStart.getTime() + windowMs - Date.now();
	if (left <= 0 || row.count < limit) return OPEN;
	return { blocked: true, retryAfterSeconds: Math.ceil(left / 1000) };
}

/** Looks at a counter without changing it. */
export async function checkLimit(
	key: string,
	limit: number,
	windowMs: number
): Promise<LimitState> {
	const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
	return stateOf(row, limit, windowMs);
}

/** Adds one to a counter (starting a new window if the old one ended) and says where it stands. */
export async function countHit(key: string, limit: number, windowMs: number): Promise<LimitState> {
	const seconds = windowMs / 1000;
	const ended = sql`${rateLimits.windowStart} < now() - make_interval(secs => ${seconds})`;
	const [row] = await db
		.insert(rateLimits)
		.values({ key, count: 1, windowStart: new Date() })
		.onConflictDoUpdate({
			target: rateLimits.key,
			set: {
				count: sql`case when ${ended} then 1 else ${rateLimits.count} + 1 end`,
				windowStart: sql`case when ${ended} then now() else ${rateLimits.windowStart} end`
			}
		})
		.returning();
	// The one that tips the count over the limit is the first to be refused
	return stateOf(row, limit + 1, windowMs);
}

/** Forgets a counter, for example after a correct password. */
export async function clearLimit(key: string): Promise<void> {
	await db.delete(rateLimits).where(eq(rateLimits.key, key));
}

/** The visitor's address as Cloudflare reports it, or a shared bucket if it is not known. */
export function clientKey(getClientAddress: () => string): string {
	try {
		return getClientAddress();
	} catch {
		return 'unknown';
	}
}
