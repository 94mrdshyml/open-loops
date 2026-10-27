import { env } from '$env/dynamic/private';
import { getCategories } from '$lib/server/queries/posts';
import { getSettings } from '$lib/server/queries/settings';
import { getAllAuthors } from '$lib/server/queries/authors';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const [navCategories, settings, allAuthors] = await Promise.all([
		getCategories(),
		getSettings(),
		getAllAuthors()
	]);

	const navAuthors = allAuthors.map((a) => ({
		id: a.id,
		slug: a.slug ?? '',
		displayName: a.publicName || a.displayName
	}));

	return {
		navCategories,
		navAuthors,
		isNewsletterSubscriber: locals.user?.isNewsletterSubscriber ?? false,
		umamiWebsiteId: settings?.umami_website_id || env.UMAMI_WEBSITE_ID || null,
		gtmId: settings?.gtm_id || null,
		ga4Id: settings?.ga4_id || null,
		metaPixelId: settings?.meta_pixel_id || null,
		siteUrl: url.origin,
		siteName: settings?.site_name ?? 'Open Tabs',
		siteTagline: settings?.site_tagline ?? 'Clarity on business, politics, and geopolitics.',
		ogImageUrl: settings?.og_image_url ?? null,
		user: locals.user
			? {
					id: locals.user.id,
					name: locals.user.name,
					firstName: locals.user.firstName,
					lastName: locals.user.lastName,
					avatarUrl: locals.user.avatarUrl,
					role: locals.user.role
				}
			: null
	};
};
