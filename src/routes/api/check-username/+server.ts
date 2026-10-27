import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { clientKey, countHit } from '$lib/server/rate-limit';
import type { RequestHandler } from './$types';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// 30 lookups per address per minute. Counted in the database, so it holds on every server.
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	const state = await countHit(
		`check-username:${clientKey(getClientAddress)}`,
		RATE_LIMIT,
		WINDOW_MS
	);
	if (state.blocked) {
		return json({ available: false, reason: 'rate_limited' }, { status: 429 });
	}

	const username = url.searchParams.get('username') ?? '';

	if (!USERNAME_RE.test(username)) {
		return json({ available: false, reason: 'invalid_format' });
	}

	let existing: { id: string } | undefined;
	try {
		[existing] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.username, username))
			.limit(1);
	} catch {
		return json({ available: false, reason: 'db_error' }, { status: 500 });
	}

	return json({ available: !existing });
};
