import { redirect } from '@sveltejs/kit';
import { getPendingCommentCount } from '$lib/server/queries/comments';
import { getSettings } from '$lib/server/queries/settings';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const [pendingCommentCount, settings] = await Promise.all([
		getPendingCommentCount().catch(() => 0),
		getSettings().catch(() => null)
	]);
	return {
		user: locals.user,
		pendingCommentCount,
		// Analytics now lives in Umami. The menu links out to the saved share page.
		umamiShareUrl: settings?.umami_share_url ?? null
	};
};
