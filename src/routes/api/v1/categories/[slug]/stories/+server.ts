import { getCategoryBySlug } from '$lib/server/queries/posts';
import { listPublishedStories } from '$lib/server/queries/public-api';
import {
	CATEGORY_SLUG,
	apiError,
	apiJson,
	preflight,
	readPaging,
	serveApi,
	siteOrigin
} from '$lib/server/public-api';
import type { RequestHandler } from './$types';

export const OPTIONS = preflight;

/** The published stories in one topic, newest first, a page at a time. */
export const GET: RequestHandler = async (event) => {
	const { slug } = event.params;
	if (!CATEGORY_SLUG.test(slug)) return apiError('bad_slug', 400);
	const paging = readPaging(event.url);
	if ('error' in paging) return apiError(paging.error, 400);
	const { limit, offset } = paging;

	return serveApi(event, `?limit=${limit}&offset=${offset}`, async () => {
		const category = await getCategoryBySlug(slug);
		if (!category) return apiError('not_found', 404);

		const stories = await listPublishedStories(siteOrigin(event.url), {
			categorySlug: slug,
			limit,
			offset
		});
		const total = category.postCount;
		return apiJson({
			category: {
				name: category.name,
				slug: category.slug,
				description: category.description ?? null
			},
			stories,
			total,
			limit,
			offset,
			hasMore: offset + stories.length < total
		});
	});
};
