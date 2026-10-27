import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import {
	syncUserToResend,
	updateNewsletterSubscription,
	sendNewsletterWelcome
} from '$lib/server/resend';
import { logger } from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const user = locals.user;

	if (user.isNewsletterSubscriber) return json({ status: 'already_subscribed' });

	await db
		.update(userTable)
		.set({
			isNewsletterSubscriber: true,
			newsletterSubscribedAt: new Date(),
			newsletterSource: 'manual'
		})
		.where(eq(userTable.id, user.id));

	// waitUntil keeps these promises alive past the response flush — plain
	// fire-and-forget gets killed by the Workers runtime once the response is sent.
	if (user.resendContactId) {
		platform?.ctx.waitUntil(updateNewsletterSubscription(user.resendContactId, true));
	} else {
		platform?.ctx.waitUntil(
			(async () => {
				const contactId = await syncUserToResend({
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					isNewsletterSubscriber: true
				});
				if (contactId) {
					await db
						.update(userTable)
						.set({ resendContactId: contactId })
						.where(eq(userTable.id, user.id));
				}
			})()
		);
	}

	platform?.ctx.waitUntil(
		sendNewsletterWelcome({
			to: user.email,
			firstName: user.firstName,
			siteUrl: env.PUBLIC_SITE_URL ?? undefined,
			userId: user.id
		}).catch((err) => {
			void logger.warn('email.send.failed', { route: '/api/newsletter/subscribe-me', error: err });
		})
	);

	return json({ status: 'subscribed' });
};
