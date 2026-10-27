import { fail } from '@sveltejs/kit';
import { getNewsletterStats, getRecentSubscribers } from '$lib/server/queries/newsletter';
import { getSettingValue, updateSettings } from '$lib/server/queries/settings';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const [stats, subscribers, askNewsletter] = await Promise.all([
		getNewsletterStats().catch(() => ({ total: 0, newThisMonth: 0, bySource: [] })),
		getRecentSubscribers(20).catch(() => []),
		getSettingValue('ask_newsletter_on_register').catch(() => null)
	]);
	return {
		stats,
		subscribers,
		askNewsletterOnRegister: askNewsletter !== 'false'
	};
};

export const actions: Actions = {
	toggleAskNewsletter: async ({ request }) => {
		const data = await request.formData();
		const value = data.get('value') === 'true' ? 'true' : 'false';
		try {
			await updateSettings({ ask_newsletter_on_register: value });
			return { saved: true };
		} catch {
			return fail(500, { error: 'Failed to save setting' });
		}
	}
};
