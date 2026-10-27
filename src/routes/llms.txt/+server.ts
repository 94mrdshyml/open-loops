import { getCategories, getPosts } from '$lib/server/queries/posts';
import { getSettings } from '$lib/server/queries/settings';
import { buildLlmsTxt } from '$lib/utils/llms-txt';
import type { RequestHandler } from './$types';

/** How many of the newest stories are listed. The sitemap holds the full list. */
const LATEST_STORIES = 40;

export const GET: RequestHandler = async ({ url }) => {
	try {
		const [categories, posts, settings] = await Promise.all([
			getCategories(),
			getPosts({ limit: LATEST_STORIES }),
			getSettings()
		]);

		const body = buildLlmsTxt({
			origin: url.origin,
			siteName: settings?.site_name ?? 'Open Tabs',
			categories,
			stories: posts.map((p) => ({
				slug: p.slug,
				title: p.title,
				subtitle: p.subtitle,
				publishedAt: p.publishedAt,
				categoryName: p.category?.name ?? null
			}))
		});

		return new Response(body, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (e) {
		// 503 with Retry-After tells a reader to come back later instead of caching a broken file.
		console.error('llms.txt DB error:', e);
		return new Response('Temporarily unavailable', {
			status: 503,
			headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '600' }
		});
	}
};
