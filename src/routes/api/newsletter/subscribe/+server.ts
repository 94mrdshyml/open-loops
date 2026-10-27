import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { clientKey, countHit } from '$lib/server/rate-limit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// This answers whether an email already has an account, so it is limited per address
	const state = await countHit(
		`newsletter-subscribe:${clientKey(getClientAddress)}`,
		20,
		60 * 60 * 1000
	);
	if (state.blocked)
		return json({ error: 'Too many tries. Please try again later.' }, { status: 429 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	if (typeof body !== 'object' || body === null || !('email' in body)) {
		return json({ error: 'email required' }, { status: 400 });
	}

	const email = String((body as Record<string, unknown>).email)
		.trim()
		.toLowerCase();
	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return json({ error: 'Invalid email' }, { status: 400 });
	}

	const [existing] = await db
		.select({
			id: userTable.id,
			isNewsletterSubscriber: userTable.isNewsletterSubscriber
		})
		.from(userTable)
		.where(eq(userTable.email, email))
		.limit(1);

	if (existing) {
		if (existing.isNewsletterSubscriber) {
			return json({ status: 'already_subscribed' });
		}
		// Email belongs to a registered account — guide to log in
		return json({ status: 'has_account' });
	}

	// New user — no account exists
	return json({ status: 'setup_required', email });
};
