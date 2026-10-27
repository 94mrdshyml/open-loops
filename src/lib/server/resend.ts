import { Resend } from 'resend';
import { render } from '@react-email/components';
import { env } from '$env/dynamic/private';
import { getSettings } from '$lib/server/queries/settings';
import { logEmailSend } from '$lib/server/queries/email-sends';
import { logger } from '$lib/server/logger';
import { normaliseOrigin } from '$lib/server/indexnow';
import { makeUnsubscribeToken } from '$lib/server/unsubscribe-token';
import type { SiteSettings } from '$lib/types/index';
import NewsletterWelcome from '$lib/email/newsletter-welcome';
import RegistrationWelcome from '$lib/email/registration-welcome';

export async function getResendClient(): Promise<Resend | null> {
	const settings = await getSettings();
	const apiKey = settings?.resend_api_key ?? env.RESEND_API_KEY;
	if (!apiKey) {
		console.warn(
			'[resend] getResendClient: no API key found (db:',
			!!settings?.resend_api_key,
			'env:',
			!!env.RESEND_API_KEY,
			')'
		);
		return null;
	}
	return new Resend(apiKey);
}

export function getFromAddress(settings?: SiteSettings | null): string {
	const email = settings?.resend_from_email ?? env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
	const name = settings?.resend_from_name ?? env.RESEND_FROM_NAME;
	return name ? `${name} <${email}>` : email;
}

function getSegmentAllUsersId(): string {
	return env.RESEND_SEGMENT_ALL_USERS_ID ?? '';
}

function getSegmentNewsletterId(): string {
	return env.RESEND_SEGMENT_NEWSLETTER_ID ?? '';
}

function getTopicNewsletterId(): string {
	return env.RESEND_TOPIC_NEWSLETTER_ID ?? '';
}

export async function syncUserToResend(user: {
	email: string;
	firstName: string | null;
	lastName: string | null;
	isNewsletterSubscriber: boolean;
}): Promise<string | null> {
	if (!env.RESEND_SEGMENT_ALL_USERS_ID) {
		void logger.warn('resend.sync_skipped_missing_config', {
			route: 'resend.syncUserToResend',
			meta: { missing: 'RESEND_SEGMENT_ALL_USERS_ID' }
		});
		return null;
	}
	try {
		const resend = await getResendClient();
		if (!resend) {
			void logger.warn('resend.sync_skipped_no_client', { route: 'resend.syncUserToResend' });
			return null;
		}
		const segments: { id: string }[] = [{ id: getSegmentAllUsersId() }];
		if (user.isNewsletterSubscriber && env.RESEND_SEGMENT_NEWSLETTER_ID) {
			segments.push({ id: getSegmentNewsletterId() });
		}
		const { data, error } = await resend.contacts.create({
			email: user.email,
			firstName: user.firstName ?? undefined,
			lastName: user.lastName ?? undefined,
			unsubscribed: false,
			segments,
			topics:
				user.isNewsletterSubscriber && env.RESEND_TOPIC_NEWSLETTER_ID
					? [{ id: getTopicNewsletterId(), subscription: 'opt_in' }]
					: undefined
		});
		if (error || !data) {
			void logger.warn('email.send.failed', {
				route: 'resend.syncUserToResend',
				error
			});
			return null;
		}
		return data.id;
	} catch (err) {
		void logger.warn('email.send.failed', { route: 'resend.syncUserToResend', error: err });
		return null;
	}
}

export async function updateNewsletterSubscription(
	resendContactId: string,
	subscribe: boolean
): Promise<void> {
	if (!env.RESEND_SEGMENT_NEWSLETTER_ID || !env.RESEND_TOPIC_NEWSLETTER_ID) {
		void logger.warn('resend.sync_skipped_missing_config', {
			route: 'resend.updateNewsletterSubscription',
			meta: {
				missing: !env.RESEND_SEGMENT_NEWSLETTER_ID
					? 'RESEND_SEGMENT_NEWSLETTER_ID'
					: 'RESEND_TOPIC_NEWSLETTER_ID'
			}
		});
		return;
	}
	try {
		const resend = await getResendClient();
		if (!resend) return;
		await Promise.all([
			subscribe
				? resend.contacts.segments.add({
						contactId: resendContactId,
						segmentId: getSegmentNewsletterId()
					})
				: resend.contacts.segments.remove({
						contactId: resendContactId,
						segmentId: getSegmentNewsletterId()
					}),
			resend.contacts.topics.update({
				id: resendContactId,
				topics: [
					{
						id: getTopicNewsletterId(),
						subscription: subscribe ? 'opt_in' : 'opt_out'
					}
				]
			})
		]);
	} catch (err) {
		void logger.warn('email.send.failed', {
			route: 'resend.updateNewsletterSubscription',
			error: err
		});
	}
}

export async function updateResendContact(
	resendContactId: string,
	fields: { firstName?: string | null; lastName?: string | null }
): Promise<void> {
	try {
		const resend = await getResendClient();
		if (!resend) return;
		await resend.contacts.update({
			id: resendContactId,
			firstName: fields.firstName ?? undefined,
			lastName: fields.lastName ?? undefined
		});
	} catch (err) {
		void logger.warn('email.send.failed', { route: 'resend.updateResendContact', error: err });
	}
}

function resolveMergeTags(text: string, vars: Record<string, string | null | undefined>): string {
	return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

export async function sendNewsletterWelcome(params: {
	to: string;
	firstName: string | null;
	siteUrl?: string;
	unsubscribeUrl?: string;
	userId?: string | null;
}): Promise<void> {
	try {
		const settings = await getSettings();
		const resend = await getResendClient();
		if (!resend) return;
		const from = getFromAddress(settings);
		const subject = settings?.email_nl_subject ?? 'Welcome to Open Tabs Newsletter';
		// The link carries a token that only this site can make, so it unsubscribes this person and no one else
		const siteBase =
			normaliseOrigin(params.siteUrl ?? env.PUBLIC_SITE_URL) ?? 'https://blog.indexdaily.in';
		const unsubscribeUrl =
			params.unsubscribeUrl ??
			(env.BETTER_AUTH_SECRET
				? `${siteBase}/unsubscribe?t=${await makeUnsubscribeToken(params.to, env.BETTER_AUTH_SECRET)}`
				: `${siteBase}/unsubscribe`);

		const mergeVars: Record<string, string | null | undefined> = {
			firstName: params.firstName,
			lastName: null
		};
		const rawHeadline = settings?.email_nl_headline;
		const rawBodyText = settings?.email_nl_body;

		const html = await render(
			NewsletterWelcome({
				firstName: params.firstName,
				headline: rawHeadline ? resolveMergeTags(rawHeadline, mergeVars) : undefined,
				bodyText: rawBodyText ? resolveMergeTags(rawBodyText, mergeVars) : undefined,
				siteUrl: params.siteUrl ?? env.PUBLIC_SITE_URL ?? undefined,
				unsubscribeUrl
			})
		);
		const { data } = await resend.emails.send({ from, to: params.to, subject, html });
		// Resend open/click tracking must be enabled per-domain in Resend → Domains → Settings
		await logEmailSend({
			type: 'newsletter_welcome',
			toEmail: params.to,
			userId: params.userId,
			subject,
			resendEmailId: data?.id ?? null
		});
	} catch (err) {
		console.error('[email:nl] exception:', err instanceof Error ? err.message : String(err));
		void logger.warn('email.send.failed', { route: 'resend.sendNewsletterWelcome', error: err });
	}
}

export async function sendRegistrationWelcome(params: {
	to: string;
	firstName: string | null;
	siteUrl?: string;
	userId?: string | null;
}): Promise<void> {
	console.log('[email:reg] called');
	try {
		const settings = await getSettings();
		const resend = await getResendClient();
		if (!resend) {
			console.warn('[email:reg] aborting — no Resend client');
			return;
		}
		console.log('[email:reg] client ok, rendering template...');
		const from = getFromAddress(settings);
		const subject = settings?.email_reg_subject ?? 'Welcome to Open Tabs';
		const html = await render(
			RegistrationWelcome({
				firstName: params.firstName,
				siteUrl: params.siteUrl ?? env.PUBLIC_SITE_URL ?? undefined
			})
		);
		console.log('[email:reg] template rendered, sending...');
		const { data, error } = await resend.emails.send({ from, to: params.to, subject, html });
		if (error) {
			console.error('[email:reg] send error:', error.message);
		} else {
			console.log('[email:reg] sent ok, resend id:', data?.id);
		}
		// Resend open/click tracking must be enabled per-domain in Resend → Domains → Settings
		await logEmailSend({
			type: 'registration_welcome',
			toEmail: params.to,
			userId: params.userId,
			subject,
			resendEmailId: data?.id ?? null
		});
	} catch (err) {
		// console.error here (not void logger) so it always surfaces in CF Workers logs
		console.error('[email:reg] exception:', err instanceof Error ? err.message : String(err));
		void logger.warn('email.send.failed', { route: 'resend.sendRegistrationWelcome', error: err });
	}
}
