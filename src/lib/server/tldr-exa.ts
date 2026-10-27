import { env } from '$env/dynamic/private';
import { logger, startTimer } from '$lib/server/logger';
import { getSettingValue } from '$lib/server/queries/settings';
import { checkPoints, readExaSummary } from '$lib/server/tldr-checks';

/**
 * Writes a story's TL;DR by sending Exa the address of the live page. Exa reads the page and
 * summarises it, so the story must already be public. See tldr.ts for when this is used and
 * what happens when it fails.
 */

const ENDPOINT = 'https://api.exa.ai/contents';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;
const RETRY_WAIT_MS = 3000;

/** The same rules as the OpenRouter prompt in tldr.ts, written for a page and not for plain text. */
const QUERY = `Summarise only the main article on this page (the story text under the headline). Ignore the site menu, footer, newsletter box, comments, the "Keep these tabs open" related stories, and the "In brief" box near the top if there is one. Do not copy it; write your own points from the article text.
Write 4 points (never fewer than 3, never more than 5) that a reader can scan in 20 seconds.
Rules:
- Use only facts, names and numbers that appear in the article. Copy numbers and units exactly. Add nothing from outside the article.
- No opinions, predictions or advice that the article does not state.
- The first point says what happened, or what question the article answers, and why it matters.
- Each point is one or two plain sentences, at most 40 words.
- Plain words that a general reader understands. Spell out abbreviations or avoid them.
- British English. Active voice.
- Do not use dashes, slashes between words, emoji, markdown, or quotation marks unless the article quotes those exact words.
- Do not start with "This article", "The article", "In conclusion" or "Overall".
Return the points in the "points" list.`;

const SCHEMA = {
	type: 'object',
	properties: { points: { type: 'array', items: { type: 'string' } } },
	required: ['points']
};

/**
 * The Exa key. It is saved in Dashboard, Settings, Integrations, so it can be changed without
 * touching the server. The EXA_API_KEY environment variable works as a fallback.
 */
export async function getExaKey(): Promise<string | null> {
	let saved: string | null = null;
	try {
		saved = (await getSettingValue('exa_api_key'))?.trim() || null;
	} catch (e) {
		// A settings read problem should not stop a story from getting its TL;DR
		console.error('[tldr] Could not read the saved Exa key:', e);
	}
	return saved ?? env.EXA_API_KEY?.trim() ?? null;
}

type AttemptFailure =
	| 'auth'
	| 'rate_limited'
	| 'not_readable'
	| 'timeout'
	| 'upstream'
	| 'bad_reply';

type Attempt =
	| { ok: true; points: string[]; cost: number | null }
	| { ok: false; kind: AttemptFailure; detail: string };

interface ExaStatus {
	status?: string;
	source?: string;
	error?: { tag?: string; httpStatusCode?: number };
}

interface ExaResponse {
	results?: { summary?: string }[];
	statuses?: ExaStatus[];
	costDollars?: { total?: number };
	error?: string;
}

function snippet(text: string): string {
	return text.replace(/\s+/g, ' ').trim().slice(0, 160);
}

async function askExa(key: string, pageUrl: string): Promise<Attempt> {
	let res: Response;
	try {
		res = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-api-key': key },
			// maxAgeHours 0 means read the page now. A saved copy could be of an older version.
			body: JSON.stringify({
				urls: [pageUrl],
				maxAgeHours: 0,
				summary: { query: QUERY, schema: SCHEMA }
			}),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});
	} catch (e) {
		if (e instanceof Error && e.name === 'TimeoutError') {
			return { ok: false, kind: 'timeout', detail: 'Exa took too long to answer' };
		}
		return { ok: false, kind: 'upstream', detail: 'could not reach Exa' };
	}

	const raw = await res.text();
	if (!res.ok) {
		const detail = `HTTP ${res.status}: ${snippet(raw)}`;
		if (res.status === 401 || res.status === 402 || res.status === 403) {
			return { ok: false, kind: 'auth', detail };
		}
		if (res.status === 429) return { ok: false, kind: 'rate_limited', detail };
		return { ok: false, kind: 'upstream', detail };
	}

	let body: ExaResponse;
	try {
		body = JSON.parse(raw) as ExaResponse;
	} catch {
		return { ok: false, kind: 'bad_reply', detail: 'Exa sent something that is not JSON' };
	}

	const page = body.statuses?.[0];
	if (page && page.status !== 'success') {
		const why = [page.status, page.error?.tag, page.error?.httpStatusCode]
			.filter(Boolean)
			.join(' ');
		return { ok: false, kind: 'not_readable', detail: `Exa could not read the page (${why})` };
	}

	const summary = body.results?.[0]?.summary;
	if (typeof summary !== 'string' || !summary.trim()) {
		return { ok: false, kind: 'bad_reply', detail: 'Exa sent no summary' };
	}
	const points = readExaSummary(summary);
	if (!points) {
		return { ok: false, kind: 'bad_reply', detail: 'the summary was not a list of 3 to 5 points' };
	}
	return { ok: true, points, cost: body.costDollars?.total ?? null };
}

export type ExaResult = { ok: true; points: string[] } | { ok: false; detail: string };

/**
 * Asks Exa for the points, and tries a second time if the page could not be read yet or the
 * points broke a rule. A wrong key or a rate limit is not tried again, as the second try would
 * fail the same way. `article` is the story's own text, used to check every number and quotation.
 */
export async function tldrFromExa(
	key: string,
	pageUrl: string,
	article: string,
	userId?: string
): Promise<ExaResult> {
	const elapsed = startTimer();
	let detail = 'Exa did not answer';

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		if (attempt > 1) await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_MS));

		const reply = await askExa(key, pageUrl);
		if (reply.ok) {
			const problem = checkPoints(reply.points, { strict: true, article });
			if (!problem) {
				logger.info('tldr.generated', {
					userId,
					durationMs: elapsed(),
					meta: { provider: 'exa', points: reply.points.length, attempt, cost: reply.cost }
				});
				return { ok: true, points: reply.points };
			}
			detail = `Exa's points were not used: ${problem}`;
			console.error('[tldr] Exa points rejected:', problem, reply.points);
		} else {
			detail = reply.detail;
			if (reply.kind === 'auth' || reply.kind === 'rate_limited') break;
		}
	}

	logger.warn('tldr.failed', { userId, durationMs: elapsed(), meta: { provider: 'exa', detail } });
	console.error('[tldr] Exa failed:', detail);
	return { ok: false, detail };
}
