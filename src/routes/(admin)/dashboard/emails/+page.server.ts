import { fail, redirect } from '@sveltejs/kit';
import { render } from '@react-email/components';
import { env } from '$env/dynamic/private';
import { getSettings, updateSettings } from '$lib/server/queries/settings';
import { getEmailSends, getEmailSendStats } from '$lib/server/queries/email-sends';
import { getResendClient, getFromAddress } from '$lib/server/resend';
import { instrumentAction } from '$lib/server/instrument-action';
import NewsletterWelcome from '$lib/email/newsletter-welcome';
import RegistrationWelcome from '$lib/email/registration-welcome';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') redirect(302, '/dashboard');

	const [sends, stats, settings] = await Promise.all([
		getEmailSends(50, 0),
		getEmailSendStats(),
		getSettings()
	]);

	const siteUrl = env.PUBLIC_SITE_URL ?? 'https://blog.indexdaily.in';

	const [nlPreviewHtml, regPreviewHtml] = await Promise.all([
		render(
			NewsletterWelcome({
				firstName: 'Reader',
				headline: settings?.email_nl_headline ?? undefined,
				bodyText: settings?.email_nl_body ?? undefined,
				siteUrl
			})
		).catch(() => ''),
		render(
			RegistrationWelcome({
				firstName: 'Reader',
				siteUrl
			})
		).catch(() => '')
	]);

	return {
		sends,
		stats,
		nlPreviewHtml,
		regPreviewHtml,
		emailSettings: {
			nlSubject: settings?.email_nl_subject ?? 'Welcome to Open Tabs Newsletter',
			nlHeadline: settings?.email_nl_headline ?? '',
			nlBodyText: settings?.email_nl_body ?? '',
			regSubject: settings?.email_reg_subject ?? 'Welcome to Open Tabs',
			fromName: settings?.resend_from_name ?? env.RESEND_FROM_NAME ?? '',
			fromEmail: settings?.resend_from_email ?? env.RESEND_FROM_EMAIL ?? ''
		}
	};
};

export const actions: Actions = {
	saveSenderSettings: async ({ request, locals }) => {
		const data = await request.formData();
		return instrumentAction(
			'saveSenderSettings',
			'/dashboard/emails',
			locals.user?.id,
			async () => {
				const fromName = (data.get('fromName') as string | null)?.trim() || undefined;
				const fromEmail = (data.get('fromEmail') as string | null)?.trim() || undefined;
				await updateSettings({ resend_from_name: fromName, resend_from_email: fromEmail });
				return { success: true, saved: 'sender' };
			}
		);
	},

	saveNewsletterTemplate: async ({ request, locals }) => {
		const data = await request.formData();
		return instrumentAction(
			'saveNewsletterTemplate',
			'/dashboard/emails',
			locals.user?.id,
			async () => {
				const nlSubject = (data.get('nlSubject') as string | null)?.trim() || undefined;
				const nlHeadline = (data.get('nlHeadline') as string | null)?.trim() || undefined;
				const nlBodyText = (data.get('nlBodyText') as string | null)?.trim() || undefined;
				await updateSettings({
					email_nl_subject: nlSubject,
					email_nl_headline: nlHeadline,
					email_nl_body: nlBodyText
				});
				const siteUrl = env.PUBLIC_SITE_URL ?? 'https://blog.indexdaily.in';
				const nlPreviewHtml = await render(
					NewsletterWelcome({ firstName: 'Reader', headline: nlHeadline, bodyText: nlBodyText, siteUrl })
				).catch(() => '');
				return { success: true, saved: 'newsletter', nlPreviewHtml };
			}
		);
	},

	saveRegistrationTemplate: async ({ request, locals }) => {
		const data = await request.formData();
		return instrumentAction(
			'saveRegistrationTemplate',
			'/dashboard/emails',
			locals.user?.id,
			async () => {
				const regSubject = (data.get('regSubject') as string | null)?.trim() || undefined;
				await updateSettings({ email_reg_subject: regSubject });
				return { success: true, saved: 'registration' };
			}
		);
	},

	sendTestEmail: async ({ request, locals }) => {
		const data = await request.formData();
		const template = (data.get('template') as string | null) ?? 'newsletter';

		const userEmail = locals.user?.email;
		if (!userEmail) return fail(400, { testError: 'No user email found' });

		return instrumentAction('sendTestEmail', '/dashboard/emails', locals.user?.id, async () => {
			const resend = await getResendClient();
			if (!resend)
				return fail(400, { testError: 'Resend not configured. Add API key in Settings.' });

			const settings = await getSettings();
			const from = getFromAddress(settings);
			const siteUrl = env.PUBLIC_SITE_URL ?? 'https://blog.indexdaily.in';

			try {
				if (template === 'registration') {
					const subject = settings?.email_reg_subject ?? 'Welcome to Open Tabs';
					const html = await render(
						RegistrationWelcome({ firstName: locals.user?.firstName ?? null, siteUrl })
					);
					await resend.emails.send({ from, to: userEmail, subject: `[TEST] ${subject}`, html });
				} else {
					const subject = settings?.email_nl_subject ?? 'Welcome to Open Tabs Newsletter';
					const html = await render(
						NewsletterWelcome({
							firstName: locals.user?.firstName ?? null,
							headline: settings?.email_nl_headline ?? undefined,
							bodyText: settings?.email_nl_body ?? undefined,
							siteUrl
						})
					);
					await resend.emails.send({ from, to: userEmail, subject: `[TEST] ${subject}`, html });
				}
				return { success: true, testSentTo: userEmail };
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'Unknown error';
				return fail(500, { testError: `Send failed: ${msg}` });
			}
		});
	}
};
