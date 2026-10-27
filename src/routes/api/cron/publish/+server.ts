import { json } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import { publishDueStories } from '$lib/server/scheduled-publish';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, platform, url }) => {
	const cronSecret = platform?.env?.CRON_SECRET as string | undefined;
	if (!cronSecret) {
		return new Response('Cron not configured', { status: 500 });
	}

	const auth = request.headers.get('Authorization');
	if (!auth || auth !== `Bearer ${cronSecret}`) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const published = await publishDueStories({ url, platform });
		logger.info('cron.publish', { meta: { published } });
		return json({ published });
	} catch (e) {
		logger.error('cron.publish.failed', { error: e });
		return json({ error: 'Internal error' }, { status: 500 });
	}
};
