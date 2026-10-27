import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { settings } from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';
import { getSettings, getSettingValue, updateSettings } from '$lib/server/queries/settings';
import type { StoryPublicInfo } from '$lib/server/queries/posts';

// All of these take the same list and share it with the other search engines. The shared one
// answers 429 ("too many requests") when many sites send from the same address, as Cloudflare's
// do, so the others are tried in turn.
const ENDPOINTS = [
	'https://api.indexnow.org/IndexNow',
	'https://www.bing.com/IndexNow',
	'https://yandex.com/indexnow',
	'https://search.seznam.cz/indexnow',
	'https://searchadvisory.naver.com/indexnow'
];
// The limit in the IndexNow rules is 10,000. Staying lower keeps each request small.
const BATCH_SIZE = 1000;

export interface IndexNowLast {
	at: string;
	count: number;
	/** 'ok' when the search engines took the list, otherwise a short reason. */
	result: string;
}

/** The key is made once, the first time it is needed, and then kept in settings. */
export async function getIndexNowKey(): Promise<string> {
	const saved = await getSettingValue('indexnow_key');
	if (saved) return saved;

	const bytes = crypto.getRandomValues(new Uint8Array(16));
	const fresh = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	// If two requests race, the first write wins and both read it back.
	await db
		.insert(settings)
		.values({ key: 'indexnow_key', value: fresh, updatedAt: new Date() })
		.onConflictDoNothing();
	const [row] = await db
		.select({ value: settings.value })
		.from(settings)
		.where(eq(settings.key, 'indexnow_key'))
		.limit(1);
	return row?.value ?? fresh;
}

export function parseIndexNowLast(raw: string | undefined | null): IndexNowLast | null {
	if (!raw) return null;
	try {
		const value: unknown = JSON.parse(raw);
		if (
			typeof value === 'object' &&
			value !== null &&
			'at' in value &&
			'count' in value &&
			'result' in value &&
			typeof value.at === 'string' &&
			typeof value.count === 'number' &&
			typeof value.result === 'string'
		) {
			return { at: value.at, count: value.count, result: value.result };
		}
	} catch {
		// Not valid JSON, so there is nothing to show.
	}
	return null;
}

/** Search engines cannot reach a local machine, so there is no point telling them about it. */
export function isPublicOrigin(origin: string): boolean {
	try {
		const { hostname } = new URL(origin);
		return !(
			hostname === 'localhost' ||
			hostname.endsWith('.localhost') ||
			hostname.startsWith('127.') ||
			hostname === '[::1]' ||
			hostname.endsWith('.local')
		);
	} catch {
		return false;
	}
}

export interface SubmitResult {
	sent: number;
	result: string;
}

/**
 * Tells search engines these pages changed. Never throws: a failed ping must not
 * break saving a story. Pass force to ignore the on/off switch (the dashboard button).
 */
export async function submitToIndexNow(
	origin: string,
	paths: string[],
	options: { force?: boolean } = {}
): Promise<SubmitResult> {
	try {
		if (!isPublicOrigin(origin)) return { sent: 0, result: 'skipped: local site' };

		const all = await getSettings();
		if (!options.force && all?.indexnow_enabled === '0') {
			return { sent: 0, result: 'skipped: switched off' };
		}

		const urls = [...new Set(paths)].map((path) => `${origin}${path}`);
		if (urls.length === 0) return { sent: 0, result: 'skipped: nothing to send' };

		const key = all?.indexnow_key || (await getIndexNowKey());
		const host = new URL(origin).host;

		let result = 'ok';
		for (let i = 0; i < urls.length; i += BATCH_SIZE) {
			const body = JSON.stringify({
				host,
				key,
				keyLocation: `${origin}/${key}.txt`,
				urlList: urls.slice(i, i + BATCH_SIZE)
			});
			let status = 0;
			// What each endpoint said, so a failure shows who refused and why.
			const tried: string[] = [];
			for (const endpoint of ENDPOINTS) {
				try {
					const response = await fetch(endpoint, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json; charset=utf-8' },
						body
					});
					status = response.status;
				} catch {
					// Could not reach this one, so try the next.
					status = 0;
				}
				tried.push(`${new URL(endpoint).hostname} ${status === 0 ? 'no answer' : status}`);
				if (status === 0) continue;
				// 200 and 202 both mean the list was taken. Only a busy or broken endpoint is
				// worth trying elsewhere; a refused key or address would be refused everywhere.
				if (status === 200 || status === 202) break;
				if (status !== 429 && status < 500) break;
			}
			if (status !== 200 && status !== 202) {
				result = tried.join(', ');
				break;
			}
		}

		const last: IndexNowLast = { at: new Date().toISOString(), count: urls.length, result };
		await updateSettings({ indexnow_last: JSON.stringify(last) });
		if (result !== 'ok') {
			await logger.warn('indexnow.rejected', { meta: { result, count: urls.length } });
		}
		return { sent: urls.length, result };
	} catch (error) {
		await logger.warn('indexnow.failed', { error });
		return { sent: 0, result: 'failed' };
	}
}

/** PUBLIC_SITE_URL is sometimes saved without https://, so add it and drop any trailing slash. */
export function normaliseOrigin(value: string | undefined): string | undefined {
	if (!value) return undefined;
	try {
		return new URL(/^https?:\/\//.test(value) ? value : `https://${value}`).origin;
	} catch {
		return undefined;
	}
}

interface NotifyEvent {
	url: URL;
	platform?: App.Platform;
}

/**
 * Sends the ping after the response has gone out, so saving never waits for it.
 * Without a Cloudflare context (local dev) it just runs in the background.
 */
export function notifyIndexNow(event: NotifyEvent, paths: string[], origin?: string): void {
	if (paths.length === 0) return;
	const job = submitToIndexNow(origin ?? event.url.origin, paths);
	event.platform?.ctx.waitUntil(job);
}

/** The pages that change when a story goes live, changes, or comes down. */
export function pathsForStory(
	story: Pick<StoryPublicInfo, 'slug' | 'categorySlug'> | null | undefined
): string[] {
	if (!story) return [];
	const paths = ['/', `/posts/${encodeURIComponent(story.slug)}`];
	if (story.categorySlug) paths.push(`/categories/${encodeURIComponent(story.categorySlug)}`);
	return paths;
}
