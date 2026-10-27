import { getPostCount } from '$lib/server/queries/posts';
import { listPublishedStories } from '$lib/server/queries/public-api';
import {
	apiError,
	apiJson,
	preflight,
	readPaging,
	serveApi,
	siteOrigin
} from '$lib/server/public-api';
import type { RequestHandler } from './$types';

export const OPTIONS = preflight;

/** Every published story, newest first, a page at a time. */
export const GET: RequestHandler = async (event) => {
	const paging = readPaging(event.url);
	if ('error' in paging) return apiError(paging.error, 400);
	const { limit, offset } = paging;

	return serveApi(event, `?limit=${limit}&offset=${offset}`, async () => {
		const [stories, total] = await Promise.all([
			listPublishedStories(siteOrigin(event.url), { limit, offset }),
			getPostCount()
		]);
		return apiJson({ stories, total, limit, offset, hasMore: offset + stories.length < total });
	});
};
