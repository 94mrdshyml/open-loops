import { env } from '$env/dynamic/public';
import { normaliseOrigin, notifyIndexNow, pathsForStory } from '$lib/server/indexnow';
import { logger } from '$lib/server/logger';
import { getStoryPublicInfos, publishScheduledPosts } from '$lib/server/queries/posts';
import { ensureTldr } from '$lib/server/tldr';

// The free model allows few requests a day, and a run has only a short window after the reply.
// Posts past this number get their TL;DR from the Generate button in the editor.
const MAX_TLDRS_PER_RUN = 3;

// Cloudflare Pages cannot run a timer, so visits to the site do the checking. Each running copy of
// the site checks at most this often. The check is one database statement.
const CHECK_EVERY_MS = 60_000;

interface DueEvent {
	url: URL;
	platform?: App.Platform;
}

/**
 * Publishes every story whose time has come, then (after the reply has gone out) writes their
 * TL;DRs and tells search engines. Returns how many went live.
 */
export async function publishDueStories(event: DueEvent): Promise<number> {
	const publishedIds = await publishScheduledPosts();
	if (publishedIds.length === 0) return 0;

	// Exa reads the live page, so it needs the site's own address (a timer may call from any address).
	const siteOrigin = normaliseOrigin(env.PUBLIC_SITE_URL) ?? event.url.origin;
	const writing = Promise.allSettled(
		publishedIds.slice(0, MAX_TLDRS_PER_RUN).map((id) => ensureTldr(id, undefined, siteOrigin))
	);
	if (event.platform?.ctx) event.platform.ctx.waitUntil(writing);
	else await writing;

	// Search engines hear about each story the moment it goes live.
	notifyIndexNow(
		event,
		(await getStoryPublicInfos(publishedIds)).flatMap(pathsForStory),
		normaliseOrigin(env.PUBLIC_SITE_URL)
	);

	return publishedIds.length;
}

async function runCheck(event: DueEvent): Promise<void> {
	try {
		const published = await publishDueStories(event);
		if (published > 0) await logger.info('scheduled.published', { meta: { published } });
	} catch (e) {
		await logger.error('scheduled.check.failed', { error: e });
	}
}

let lastCheck = 0;

/**
 * Called on page visits. Starts the check in the background, at most once a minute, and never
 * throws, so a failing check cannot break a page.
 */
export function checkDueStoriesSoon(event: DueEvent, now = Date.now()): void {
	if (now - lastCheck < CHECK_EVERY_MS) return;
	lastCheck = now;
	// Without a Cloudflare context (local dev) it just runs in the background.
	const job = runCheck(event);
	event.platform?.ctx.waitUntil(job);
}
