import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { normaliseOrigin } from '$lib/server/indexnow';
import { logger } from '$lib/server/logger';
import { clientKey, countHit } from '$lib/server/rate-limit';

// The public read-only API (/api/v1). Anyone may call it, no key. Safe because it only reads
// published stories, sends chosen fields, and never looks at cookies.

// 60 requests per address per minute across all three routes. Counted in the database.
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

/** Cloudflare keeps each answer this long, so repeat requests never reach the database. */
const CACHE_SECONDS = 60;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_OFFSET = 5000;

/** A story id: `pst_` and 32 letters or digits. Checked before the database is asked. */
export const STORY_ID = /^pst_[0-9A-Za-z]{32}$/;
export const CATEGORY_SLUG = /^[a-z0-9-]{1,100}$/;

const CORS = { 'Access-Control-Allow-Origin': '*' };

export function apiError(error: string, status: number, headers?: Record<string, string>) {
	return json({ error }, { status, headers: { ...CORS, 'Cache-Control': 'no-store', ...headers } });
}

export function apiJson(body: unknown): Response {
	return json(body, {
		headers: { ...CORS, 'Cache-Control': `public, max-age=${CACHE_SECONDS}` }
	});
}

/** Answers the browser's "may I?" check for calls from other websites. GET only. */
export const preflight: RequestHandler = () =>
	new Response(null, {
		status: 204,
		headers: {
			...CORS,
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Max-Age': '86400'
		}
	});

/** The page size and start point from ?limit= and ?offset=. The caller can never ask for more than 50. */
export function readPaging(
	url: URL
): { limit: number; offset: number } | { error: 'bad_limit' | 'bad_offset' } {
	const rawLimit = url.searchParams.get('limit');
	const rawOffset = url.searchParams.get('offset');
	const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit);
	const offset = rawOffset === null ? 0 : Number(rawOffset);
	if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) return { error: 'bad_limit' };
	if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET)
		return { error: 'bad_offset' };
	return { limit, offset };
}

/** The site's own address, used to build each story's link. */
export function siteOrigin(url: URL): string {
	return normaliseOrigin(env.PUBLIC_SITE_URL) ?? url.origin;
}

interface ApiEvent {
	url: URL;
	platform?: App.Platform;
	getClientAddress: () => string;
}

/**
 * Runs one API request: a saved answer first (free, not counted), otherwise the rate limit, then
 * the real work. Good answers are saved for a minute. `query` is the cleaned-up question, so
 * adding junk to the address cannot dodge the saved answer.
 */
export async function serveApi(
	event: ApiEvent,
	query: string,
	produce: () => Promise<Response>
): Promise<Response> {
	try {
		const cache = event.platform?.caches.default;
		const key = new Request(`${event.url.origin}${event.url.pathname}${query}`);

		const saved = await cache?.match(key);
		if (saved) return saved;

		const state = await countHit(`api:${clientKey(event.getClientAddress)}`, RATE_LIMIT, WINDOW_MS);
		if (state.blocked) {
			return apiError('rate_limited', 429, { 'Retry-After': String(state.retryAfterSeconds) });
		}

		const response = await produce();
		if (cache && response.status === 200) {
			event.platform?.ctx.waitUntil(cache.put(key, response.clone()));
		}
		return response;
	} catch (e) {
		await logger.error('public_api.failed', { route: event.url.pathname, error: e });
		return apiError('server_error', 500);
	}
}
