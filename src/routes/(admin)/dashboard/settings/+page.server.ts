import { fail } from '@sveltejs/kit';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { getIndexNowKey, parseIndexNowLast, submitToIndexNow } from '$lib/server/indexnow';
import { getPublicSitePaths } from '$lib/server/queries/posts';
import { getSettings, updateSettings } from '$lib/server/queries/settings';
import { checkOpenRouterKey, looksLikeApiKey, parseTldrLast } from '$lib/server/tldr';
import { instrumentAction } from '$lib/server/instrument-action';
import { isValidPostsPerPage, MAX_POSTS_PER_PAGE, MIN_POSTS_PER_PAGE } from '$lib/utils/page-size';
import { isSecureWebAddress, isTrackingId } from '$lib/utils/web-address';
import type { Actions, PageServerLoad } from './$types';

function lastFour(value: string | undefined): string | null {
	return value ? value.slice(-4) : null;
}

export const load: PageServerLoad = async ({ url }) => {
	const settings = (await getSettings()) ?? {};
	// Secret keys stay on the server. The page only gets the last four characters to show
	// which key is saved.
	const {
		openrouter_api_key: openrouterKey,
		exa_api_key: exaKey,
		tldr_last: tldrLast,
		resend_api_key: resendKey,
		indexnow_key: indexnowKey,
		indexnow_enabled: indexnowEnabled,
		indexnow_last: indexnowLast,
		...rest
	} = settings;
	// The IndexNow key is not secret (it is published in a text file), so the page may show it.
	const key = indexnowKey || (await getIndexNowKey());
	return {
		settings: rest,
		indexnow: {
			enabled: indexnowEnabled !== '0',
			keyUrl: `${url.origin}/${key}.txt`,
			last: parseIndexNowLast(indexnowLast)
		},
		openrouterKeyLast4: lastFour(openrouterKey),
		exaKeyLast4: lastFour(exaKey),
		// True while the EXA_API_KEY set on the server is being used because none is saved here
		exaEnvFallback: Boolean(env.EXA_API_KEY),
		// Which of the two wrote the most recent TL;DR, so a quiet fall back to OpenRouter shows up
		tldrLast: parseTldrLast(tldrLast),
		resendKeyLast4: lastFour(resendKey),
		// True while the old OPENROUTER_API_KEY in Cloudflare is still being used as a fallback
		openrouterEnvFallback: Boolean(env.OPENROUTER_API_KEY)
	};
};

export const actions: Actions = {
	saveGeneral: async ({ request, locals }) => {
		const data = await request.formData();
		const perPage = (data.get('postsPerPage') as string | null)?.trim() ?? '';
		if (perPage && !isValidPostsPerPage(perPage)) {
			return fail(400, {
				generalError: `Stories on the home page must be a whole number from ${MIN_POSTS_PER_PAGE} to ${MAX_POSTS_PER_PAGE}.`
			});
		}
		return instrumentAction('saveGeneral', '/dashboard/settings', locals.user?.id, async () => {
			await updateSettings({
				site_name: (data.get('siteName') as string | null)?.trim() || undefined,
				site_tagline: (data.get('tagline') as string | null)?.trim() || undefined,
				posts_per_page: perPage || undefined
			});
			return { success: true };
		});
	},

	saveIntegrations: async ({ request, locals }) => {
		const data = await request.formData();
		return instrumentAction(
			'saveIntegrations',
			'/dashboard/settings',
			locals.user?.id,
			async () => {
				const gtm = (data.get('gtmId') as string | null)?.trim() ?? '';
				const ga4 = (data.get('ga4Id') as string | null)?.trim() ?? '';
				const pixel = (data.get('metaPixelId') as string | null)?.trim() ?? '';
				const umamiId = (data.get('umamiWebsiteId') as string | null)?.trim() ?? '';
				const umamiShare = (data.get('umamiShareUrl') as string | null)?.trim() ?? '';

				// These go into the code of every page, so only the real shapes are accepted
				if (gtm && !isTrackingId('gtm', gtm)) {
					return fail(400, {
						integrationsError: 'The Google Tag Manager ID looks like GTM-XXXXXXX.'
					});
				}
				if (ga4 && !isTrackingId('ga4', ga4)) {
					return fail(400, {
						integrationsError: 'The Google Analytics ID looks like G-XXXXXXXXXX.'
					});
				}
				if (pixel && !isTrackingId('metaPixel', pixel)) {
					return fail(400, { integrationsError: 'The Meta Pixel ID is a number, with no spaces.' });
				}
				if (umamiId && !isTrackingId('umamiWebsite', umamiId)) {
					return fail(400, {
						integrationsError: 'The Umami website ID looks like a long code with dashes.'
					});
				}
				if (umamiShare && !isSecureWebAddress(umamiShare)) {
					return fail(400, { integrationsError: 'The Umami share link must start with https://.' });
				}

				await updateSettings({
					gtm_id: gtm || undefined,
					ga4_id: ga4 || undefined,
					meta_pixel_id: pixel || undefined,
					umami_website_id: umamiId || undefined,
					umami_share_url: umamiShare || undefined
				});
				return { success: true };
			}
		);
	},

	saveOpenRouter: async ({ request, locals }) => {
		const data = await request.formData();
		return instrumentAction('saveOpenRouter', '/dashboard/settings', locals.user?.id, async () => {
			if (data.get('removeKey') === '1') {
				await updateSettings({ openrouter_api_key: '' });
				return { success: true, openrouterNote: 'Saved key removed.' };
			}

			const key = String(data.get('openrouterApiKey') ?? '').trim();
			if (!key) return fail(400, { openrouterError: 'Paste your OpenRouter key first.' });
			if (!looksLikeApiKey(key)) {
				return fail(400, {
					openrouterError: 'That does not look like a key. Copy the whole key, with no spaces.'
				});
			}

			// Ask OpenRouter before saving, so a mistyped key is caught now and not on a publish
			const check = await checkOpenRouterKey(key);
			if (check === 'rejected') {
				return fail(400, {
					openrouterError: 'OpenRouter rejected this key. Check that you copied all of it.'
				});
			}

			await updateSettings({ openrouter_api_key: key });
			return {
				success: true,
				openrouterNote:
					check === 'ok'
						? 'Key saved. OpenRouter accepted it.'
						: 'Key saved. OpenRouter could not be reached to check it just now.'
			};
		});
	},

	saveExa: async ({ request, locals }) => {
		const data = await request.formData();
		return instrumentAction('saveExa', '/dashboard/settings', locals.user?.id, async () => {
			if (data.get('removeKey') === '1') {
				await updateSettings({ exa_api_key: '' });
				return { success: true, exaNote: 'Saved key removed.' };
			}

			const key = String(data.get('exaApiKey') ?? '').trim();
			if (!key) return fail(400, { exaError: 'Paste your Exa key first.' });
			if (!looksLikeApiKey(key)) {
				return fail(400, {
					exaError: 'That does not look like a key. Copy the whole key, with no spaces.'
				});
			}

			await updateSettings({ exa_api_key: key });
			return {
				success: true,
				exaNote: 'Key saved. It is used the next time a story is published.'
			};
		});
	},

	saveIndexNow: async ({ request, locals }) => {
		const data = await request.formData();
		return instrumentAction('saveIndexNow', '/dashboard/settings', locals.user?.id, async () => {
			await updateSettings({ indexnow_enabled: data.get('indexnowEnabled') === 'on' ? '1' : '0' });
			return { success: true, indexnowNote: 'Saved.' };
		});
	},

	sendSiteIndexNow: async ({ locals, url }) => {
		return instrumentAction(
			'sendSiteIndexNow',
			'/dashboard/settings',
			locals.user?.id,
			async () => {
				const paths = await getPublicSitePaths();
				const { sent, result } = await submitToIndexNow(url.origin, paths, { force: true });
				if (result.startsWith('skipped: local')) {
					return fail(400, {
						indexnowError:
							'This is a local copy of the site. Search engines can only be told from the live site.'
					});
				}
				if (result !== 'ok') {
					return fail(502, {
						indexnowError: `Search engines did not take the list (${result}). Try again later.`
					});
				}
				return { success: true, indexnowNote: `Sent ${sent} pages to search engines.` };
			}
		);
	},

	saveSeoDefaults: async ({ request, locals }) => {
		const data = await request.formData();
		return instrumentAction('saveSeoDefaults', '/dashboard/settings', locals.user?.id, async () => {
			await updateSettings({
				meta_description:
					(data.get('defaultMetaDescription') as string | null)?.trim() || undefined,
				og_image_url: (data.get('defaultOgImageUrl') as string | null)?.trim() || undefined
			});
			return { success: true };
		});
	},

	saveEmail: async ({ request, locals }) => {
		const data = await request.formData();
		return instrumentAction('saveEmail', '/dashboard/settings', locals.user?.id, async () => {
			const apiKey = (data.get('resendApiKey') as string | null)?.trim();
			const fromEmail = (data.get('resendFromEmail') as string | null)?.trim();
			await updateSettings({
				resend_api_key: apiKey || undefined,
				resend_from_email: fromEmail || undefined
			});
			return { success: true };
		});
	},

	sendTestEmail: async ({ request, locals }) => {
		const data = await request.formData();
		const apiKey = (data.get('resendApiKey') as string | null)?.trim();

		if (!apiKey) {
			return fail(400, { emailError: 'Save your Resend API key first' });
		}

		const userEmail = locals.user?.email;
		if (!userEmail) {
			return fail(400, { emailError: 'No user email found' });
		}

		return instrumentAction('sendTestEmail', '/dashboard/settings', locals.user?.id, async () => {
			try {
				const resend = new Resend(apiKey);
				await resend.emails.send({
					from: (() => {
						const email =
							(data.get('resendFromEmail') as string | null)?.trim() ||
							env.RESEND_FROM_EMAIL ||
							'onboarding@resend.dev';
						const name =
							(data.get('resendFromName') as string | null)?.trim() || env.RESEND_FROM_NAME;
						return name ? `${name} <${email}>` : email;
					})(),
					to: userEmail,
					subject: 'Open Tabs — Email configuration test',
					text: 'If you received this email, your Resend integration is working correctly.'
				});
				return { success: true, testEmailSent: true, sentTo: userEmail };
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				return fail(500, { emailError: `Failed to send: ${message}` });
			}
		});
	}
};
