import { getPublishedStory } from '$lib/server/queries/public-api';
import {
	STORY_ID,
	apiError,
	apiJson,
	preflight,
	serveApi,
	siteOrigin
} from '$lib/server/public-api';
import type { RequestHandler } from './$types';

export const OPTIONS = preflight;

/** One published story with its text. Anything that is not live answers "not_found". */
export const GET: RequestHandler = async (event) => {
	const { id } = event.params;
	if (!STORY_ID.test(id)) return apiError('bad_id', 400);

	return serveApi(event, '', async () => {
		const story = await getPublishedStory(siteOrigin(event.url), id);
		return story ? apiJson({ story }) : apiError('not_found', 404);
	});
};
