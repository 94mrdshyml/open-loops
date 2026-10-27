import { error } from '@sveltejs/kit';
import {
	getFeaturedPosts,
	getCategories,
	getPosts,
	getSiteSettings
} from '$lib/server/queries/posts';
import { getHomepageCategories } from '$lib/server/queries/categories';
import { MAX_LATEST_ROWS, postsPerPage } from '$lib/utils/page-size';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const categorySlug = url.searchParams.get('category') ?? undefined;

	// Without JavaScript the "Load more" button is a plain form that asks for ?latest=2, 3, ...
	// With JavaScript the same button fetches the next batch without reloading the page.
	const pagesShown = Math.min(
		20,
		Math.max(1, Math.floor(Number(url.searchParams.get('latest'))) || 1)
	);

	let carouselPosts, trendingPosts, categories, siteSettings;
	try {
		[carouselPosts, trendingPosts, categories, siteSettings] = await Promise.all([
			getFeaturedPosts(),
			getPosts({ limit: 5 }),
			getCategories(),
			getSiteSettings()
		]);
	} catch (e) {
		console.error('DB error in homepage load:', e);
		throw error(500, 'Something went wrong loading the homepage. Please try again.');
	}

	// One row more than shown tells us whether a "Load more" button is needed.
	const pageSize = postsPerPage(siteSettings.posts_per_page);
	const showCount = Math.min(pageSize * pagesShown, MAX_LATEST_ROWS);
	let latestRows;
	try {
		latestRows = await getPosts({ categorySlug, limit: showCount + 1 });
	} catch (e) {
		console.error('DB error in homepage load:', e);
		throw error(500, 'Something went wrong loading the homepage. Please try again.');
	}
	const latestPosts = latestRows.slice(0, showCount);
	const hasMoreLatest = latestRows.length > showCount;

	const siteName = siteSettings.site_name ?? 'Open Tabs';
	const tagline = siteSettings.site_tagline ?? 'Clarity on business, politics, and geopolitics.';

	// Build category dive groups from admin-pinned homepage categories
	let categoryDives: { category: (typeof categories)[number]; posts: typeof latestPosts }[] = [];
	try {
		const homepageCategories = await getHomepageCategories();
		categoryDives = await Promise.all(
			homepageCategories.map(async (cat) => ({
				category: cat,
				posts: await getPosts({ categorySlug: cat.slug, limit: 3 })
			}))
		);
	} catch (e) {
		console.error('DB error loading category dives:', e);
		// categoryDives stays [] — non-fatal, page renders without category dives
	}

	return {
		carouselPosts,
		trendingPosts,
		latestPosts,
		hasMoreLatest,
		categories,
		categoryDives,
		categorySlug: categorySlug ?? null,
		seo: {
			title: `${siteName} — ${tagline}`,
			description: siteSettings.meta_description ?? tagline,
			ogImageUrl: siteSettings.og_image_url ?? null,
			// The longer lists reached by "Load more" without JavaScript repeat the front page
			...(pagesShown > 1 ? { robots: 'noindex, follow' } : {})
		}
	};
};
