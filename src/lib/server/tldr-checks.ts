/**
 * The rules a TL;DR has to pass, and the reading of a model's reply into points. Pure functions
 * with no network or database, so every rule can be tested on its own. Used for the points
 * Exa writes from the live page and for the ones OpenRouter writes from the article text.
 */

export const MIN_POINTS = 3;
export const MAX_POINTS = 5;
export const MAX_POINT_WORDS = 40;

/** A run-on point at least this long with no punctuation in it at all is almost always broken. */
const RUN_ON_WORDS = 25;

export const BULLET = /^(?:[-*•]|\d+[.)])\s+/;

/**
 * One line of a reply as a clean point. Dashes are not allowed in the house style: a range of
 * numbers (0.2–1.6%, ₹16–₹8.50) becomes "to", and any other dash becomes a comma.
 */
export function cleanPoint(line: string): string {
	return line
		.replace(BULLET, '')
		.replace(/\*\*|__|`/g, '')
		.replace(/(\d%?)\s*[–—]\s*([$₹£€])?(\d)/g, '$1 to $2$3')
		.replace(/\s*[–—]\s*/g, ', ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Reads a model's plain-text reply into 3 to 5 clean points, or null when it cannot be used. */
export function parseTldrReply(reply: string): string[] | null {
	const lines = reply
		.replace(/<think>[\s\S]*?<\/think>/gi, '')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

	const bulleted = lines.filter((line) => BULLET.test(line));
	const candidates = bulleted.length > 0 ? bulleted : lines.filter((line) => !line.endsWith(':'));

	const points = candidates.map(cleanPoint).filter(Boolean).slice(0, MAX_POINTS);

	if (points.length < MIN_POINTS) return null;
	if (points.some((point) => point.length < 20 || point.length > 450)) return null;
	return points;
}

function wordCount(text: string): number {
	return text.split(/\s+/).filter(Boolean).length;
}

/** Every number in the text, written plainly: no thousands commas, no trailing full stop. */
function numbersIn(text: string): string[] {
	return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ''));
}

function plainQuotes(text: string): string {
	return text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');
}

export interface CheckOptions {
	/**
	 * The strict rules, used for text written by a model that read the whole web page: the word
	 * limit, no slashes, quotation marks or emoji, and every number and quotation must be in the
	 * article. Without it only the basic shape and the run-on check apply.
	 */
	strict?: boolean;
	/** The article's words (headline, subtitle and body). Needed for the strict checks. */
	article?: string;
}

/**
 * Why a set of points cannot be used, in a short phrase for the logs and the Settings page,
 * or null when they pass.
 */
export function checkPoints(points: string[], options: CheckOptions = {}): string | null {
	if (points.length < MIN_POINTS || points.length > MAX_POINTS) {
		return `it gave ${points.length} points, not 3 to 5`;
	}

	const article = options.article ? plainQuotes(options.article) : '';
	const articleNumbers = new Set(numbersIn(options.article ?? ''));

	for (const [index, point] of points.entries()) {
		const n = index + 1;
		if (point.length < 20 || point.length > 450) return `point ${n} is the wrong length`;

		const words = wordCount(point);
		if (words >= RUN_ON_WORDS && !/[,;:()]/.test(point) && !/\.\s+\S/.test(point)) {
			return `point ${n} is ${words} words with no punctuation`;
		}

		if (!options.strict) continue;

		if (words > MAX_POINT_WORDS) return `point ${n} has ${words} words (the limit is 40)`;
		if (/[—–]|\s-\s/.test(point)) return `point ${n} has a dash`;
		if (/\w\s?\/\s?\w/.test(point.replace(/\d\s?\/\s?\d/g, ''))) {
			return `point ${n} joins words with a slash`;
		}
		if (/\*\*|__|`|^#/.test(point)) return `point ${n} has markdown`;
		if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(point)) return `point ${n} has an emoji`;
		if (/^(?:this article|the article|in conclusion|overall)\b/i.test(point)) {
			return `point ${n} starts with a stock opener`;
		}

		if (article) {
			const missing = numbersIn(point).filter((num) => !articleNumbers.has(num));
			if (missing.length > 0) {
				return `point ${n} has ${missing.length === 1 ? 'a number' : 'numbers'} the article does not (${missing.join(', ')})`;
			}
			for (const quoted of point.matchAll(/[“"]([^”"]{3,})[”"]/g)) {
				if (!article.includes(plainQuotes(quoted[1]))) {
					return `point ${n} puts words in quotation marks that the article does not use`;
				}
			}
		}
	}
	return null;
}

/** What Exa's summary field holds: a JSON text with a "points" list, or plain bullets. */
export function readExaSummary(summary: string): string[] | null {
	try {
		const parsed: unknown = JSON.parse(summary);
		if (typeof parsed === 'object' && parsed !== null && 'points' in parsed) {
			const list = (parsed as { points: unknown }).points;
			if (Array.isArray(list) && list.every((item) => typeof item === 'string')) {
				const points = (list as string[]).map(cleanPoint).filter(Boolean);
				return points.length > 0 ? points : null;
			}
		}
	} catch {
		// Not JSON: fall through to the plain bullet reading below
	}
	return parseTldrReply(summary);
}
