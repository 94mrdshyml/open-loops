import { json } from '@sveltejs/kit';
import { searchPosts } from '$lib/server/queries/search';
import { clientKey, countHit } from '$lib/server/rate-limit';
import { SEARCH_BATCH } from '$lib/utils/search-text';
import type { RequestHandler } from './$types';

// 60 requests per address per minute, shared with the search page. Counted in the database.
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

/** The next batch of results for the search page's Load more button. */
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	const state = await countHit(`search:${clientKey(getClientAddress)}`, RATE_LIMIT, WINDOW_MS);
	if (state.blocked) return json({ error: 'rate_limited' }, { status: 429 });

	const query = url.searchParams.get('q') ?? '';
	const offset = Number(url.searchParams.get('offset') ?? '0');
	if (!Number.isInteger(offset) || offset < 0 || offset > 2000) {
		return json({ error: 'bad_offset' }, { status: 400 });
	}

	try {
		// The batch size is fixed here, never taken from the caller
		const page = await searchPosts(query, { limit: SEARCH_BATCH, offset });
		return json({ posts: page.posts, hasMore: offset + page.posts.length < page.total });
	} catch (e) {
		console.error('DB error in /api/search:', e);
		return json({ error: 'db_error' }, { status: 500 });
	}
};
