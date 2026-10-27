import { error } from '@sveltejs/kit';
import { correctedSearch, searchPosts } from '$lib/server/queries/search';
import { clientKey, countHit } from '$lib/server/rate-limit';
import { cleanSearchText, SEARCH_BATCH } from '$lib/utils/search-text';
import type { PageServerLoad } from './$types';

// 60 searches per address per minute, shared with the Load more button. Counted in the database,
// so it holds on every server.
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

/** The most "Load more" steps one address can ask for at once without JavaScript. */
const MAX_BATCHES = 10;

export const load: PageServerLoad = async ({ url, getClientAddress }) => {
	const query = cleanSearchText(url.searchParams.get('q') ?? '');
	// ?exact=1 is the "search instead for ..." link: no typo fix, search what was typed
	const exact = url.searchParams.get('exact') === '1';
	// Without JavaScript the Load more button asks for ?shown=2, 3, ... and the page reloads
	const batches = Math.min(
		MAX_BATCHES,
		Math.max(1, Math.floor(Number(url.searchParams.get('shown'))) || 1)
	);

	const base = {
		query,
		effectiveQuery: query,
		correction: null as { from: string; to: string } | null,
		results: [] as Awaited<ReturnType<typeof searchPosts>>['posts'],
		total: 0,
		hasMore: false,
		empty: true,
		limited: false
	};
	const seo = {
		title: query ? `Search: "${query}" — Open Tabs` : 'Search — Open Tabs',
		robots: 'noindex, nofollow'
	};

	if (query.length < 2) return { ...base, seo };

	const state = await countHit(`search:${clientKey(getClientAddress)}`, RATE_LIMIT, WINDOW_MS);
	if (state.blocked) return { ...base, limited: true, seo };

	try {
		const limit = SEARCH_BATCH * batches;
		let page = await searchPosts(query, { limit });
		let effectiveQuery = query;
		let correction: { from: string; to: string } | null = null;

		// Nothing found: if a typed word is not a word on the site, try the closest one that is
		if (page.total === 0 && !exact) {
			const fixed = await correctedSearch(query);
			if (fixed && fixed.toLowerCase() !== query.toLowerCase()) {
				const retry = await searchPosts(fixed, { limit });
				if (retry.total > 0) {
					page = retry;
					effectiveQuery = fixed;
					correction = { from: query, to: fixed };
				}
			}
		}

		return {
			...base,
			effectiveQuery,
			correction,
			results: page.posts,
			total: page.total,
			hasMore: page.posts.length < page.total,
			empty: page.total === 0,
			seo
		};
	} catch (e) {
		console.error('DB error in search load:', e);
		throw error(500, 'Something went wrong. Please try again.');
	}
};
