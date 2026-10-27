import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { clientKey, countHit } from '$lib/server/rate-limit';
import type { RequestHandler } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 30 lookups per address per minute. Counted in the database, so it holds on every server.
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	const state = await countHit(`check-email:${clientKey(getClientAddress)}`, RATE_LIMIT, WINDOW_MS);
	if (state.blocked) {
		return json({ available: false, reason: 'rate_limited' }, { status: 429 });
	}

	const email = url.searchParams.get('email') ?? '';

	if (!EMAIL_RE.test(email)) {
		return json({ available: false, reason: 'invalid_format' });
	}

	let existing: { id: string } | undefined;
	try {
		[existing] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.email, email.toLowerCase()))
			.limit(1);
	} catch {
		return json({ available: false, reason: 'db_error' }, { status: 500 });
	}

	return json({ available: !existing });
};
