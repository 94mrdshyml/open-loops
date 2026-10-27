import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';
import { updateNewsletterSubscription } from '$lib/server/resend';
import { readUnsubscribeToken } from '$lib/server/unsubscribe-token';
import type { Actions, PageServerLoad } from './$types';

// The email link only opens a page with a button. The button does the unsubscribing, so mail
// programs that open every link to check it for viruses cannot unsubscribe anyone by accident.

async function emailFromToken(token: string | null | undefined): Promise<string | null> {
	if (!token || !env.BETTER_AUTH_SECRET) return null;
	return readUnsubscribeToken(token, env.BETTER_AUTH_SECRET);
}

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('t');
	return { token, valid: (await emailFromToken(token)) !== null };
};

export const actions: Actions = {
	default: async ({ request, platform }) => {
		const data = await request.formData();
		const email = await emailFromToken(data.get('token')?.toString());
		if (!email)
			return fail(400, {
				error: 'This link is not valid. Please use the link in your latest email.'
			});

		const [account] = await db
			.select({ id: userTable.id, resendContactId: userTable.resendContactId })
			.from(userTable)
			.where(eq(userTable.email, email))
			.limit(1);

		if (account) {
			await db
				.update(userTable)
				.set({ isNewsletterSubscriber: false })
				.where(eq(userTable.id, account.id));
			if (account.resendContactId) {
				const sync = updateNewsletterSubscription(account.resendContactId, false);
				if (platform?.ctx) platform.ctx.waitUntil(sync);
				else await sync;
			}
			void logger.info('newsletter.unsubscribed', { route: '/unsubscribe', userId: account.id });
		}

		// The same answer whether or not an account was found
		return { done: true };
	}
};
