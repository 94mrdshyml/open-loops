import { json } from '@sveltejs/kit';
import { getPosts, getSiteSettings } from '$lib/server/queries/posts';
import { clientKey, countHit } from '$lib/server/rate-limit';
import { postsPerPage } from '$lib/utils/page-size';
import type { RequestHandler } from './$types';

// 60 requests per address per minute. Counted in the database, so it holds on every server.
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

/** The next batch for the home page's Latest list. The size comes from Settings, never the caller. */
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	const state = await countHit(`latest:${clientKey(getClientAddress)}`, RATE_LIMIT, WINDOW_MS);
	if (state.blocked) return json({ error: 'rate_limited' }, { status: 429 });

	const offset = Number(url.searchParams.get('offset') ?? '0');
	if (!Number.isInteger(offset) || offset < 0 || offset > 5000) {
		return json({ error: 'bad_offset' }, { status: 400 });
	}
	const category = url.searchParams.get('category') ?? undefined;
	if (category !== undefined && category.length > 100) {
		return json({ error: 'bad_category' }, { status: 400 });
	}

	try {
		const settings = await getSiteSettings();
		const pageSize = postsPerPage(settings.posts_per_page);
		// One row more than the batch tells us whether another batch is left.
		const rows = await getPosts({ categorySlug: category, limit: pageSize + 1, offset });
		return json({
			posts: rows
				.slice(0, pageSize)
				.map((p) => ({ slug: p.slug, title: p.title, category: p.category })),
			hasMore: rows.length > pageSize
		});
	} catch (e) {
		console.error('DB error in /api/latest:', e);
		return json({ error: 'db_error' }, { status: 500 });
	}
};
