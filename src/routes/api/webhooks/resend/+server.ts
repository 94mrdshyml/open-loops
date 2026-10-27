import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { updateEmailEvent } from '$lib/server/queries/email-sends';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const secret = env.RESEND_WEBHOOK_SECRET;
	if (!secret) {
		return json({ ok: false }, { status: 200 });
	}

	const rawBody = await request.text();
	const svixId = request.headers.get('svix-id') ?? '';
	const svixTimestamp = request.headers.get('svix-timestamp') ?? '';
	const svixSignature = request.headers.get('svix-signature') ?? '';

	let event: ReturnType<InstanceType<typeof Resend>['webhooks']['verify']>;
	try {
		const resend = new Resend(env.RESEND_API_KEY);
		event = resend.webhooks.verify({
			payload: rawBody,
			headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
			webhookSecret: secret
		});
	} catch {
		return json({ ok: false }, { status: 200 });
	}

	try {
		if (event.type === 'contact.updated') {
			const contact = event.data;
			if (contact.unsubscribed) {
				await db
					.update(userTable)
					.set({ isNewsletterSubscriber: false })
					.where(eq(userTable.email, contact.email));
			}
		} else if (event.type === 'email.complained') {
			const emailData = event.data;
			const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
			await Promise.all(
				recipients.map((to) =>
					db.update(userTable).set({ isNewsletterSubscriber: false }).where(eq(userTable.email, to))
				)
			);
		} else if (event.type === 'email.bounced') {
			void logger.warn('email.bounced', {
				route: '/api/webhooks/resend',
				meta: { emailId: event.data.email_id }
			});
			await updateEmailEvent(event.data.email_id, 'bounced');
		} else if (event.type === 'email.delivered') {
			await updateEmailEvent(event.data.email_id, 'delivered');
		} else if (event.type === 'email.opened') {
			await updateEmailEvent(event.data.email_id, 'opened');
		} else if (event.type === 'email.clicked') {
			await updateEmailEvent(event.data.email_id, 'clicked');
		}
	} catch (err) {
		void logger.error('webhook.resend.handler_error', {
			route: '/api/webhooks/resend',
			error: err
		});
	}

	return json({ ok: true });
};
