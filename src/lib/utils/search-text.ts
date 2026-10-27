/** How many results a search shows at first, and adds with each "Load more". */
export const SEARCH_BATCH = 20;

/** The longest search text used. More than this is cut off. */
export const MAX_SEARCH_CHARS = 100;

/** The reader's text, tidied: no control characters, one line, single spaces, a sensible length. */
export function cleanSearchText(raw: string): string {
	return Array.from(raw)
		.map((ch) => {
			const code = ch.charCodeAt(0);
			return code < 32 || code === 127 ? ' ' : ch;
		})
		.join('')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, MAX_SEARCH_CHARS);
}

export interface SearchWord {
	/** The word as typed. */
	text: string;
	/** Where it starts in the search text. */
	start: number;
}

/**
 * The plain words of a search that a typo fix may look at: letters and digits only, 4 or more
 * long. Anything with quote marks, a leading minus or other symbols is left alone, as is the word
 * OR, because those carry meaning (an exact phrase, a word to leave out).
 */
export function fixableWords(text: string, max = 8): SearchWord[] {
	const words: SearchWord[] = [];
	for (const match of text.matchAll(/\S+/g)) {
		const word = match[0];
		if (word.length < 4 || /[^\p{L}\p{N}]/u.test(word) || word.toUpperCase() === 'OR') continue;
		words.push({ text: word, start: match.index });
		if (words.length >= max) break;
	}
	return words;
}

/** The first letter capitalised when the original word began with a capital. */
function matchCase(original: string, replacement: string): string {
	const first = original.charAt(0);
	return first !== first.toLowerCase() && first === first.toUpperCase()
		? replacement.charAt(0).toUpperCase() + replacement.slice(1)
		: replacement;
}

/**
 * The search text with some words swapped for others. `swaps` maps a word as typed (lower case)
 * to its replacement. Spacing and every other word stay exactly as typed. Returns null when
 * nothing was swapped.
 */
export function applySwaps(text: string, swaps: Map<string, string>): string | null {
	let out = '';
	let last = 0;
	let changed = false;
	for (const word of fixableWords(text, Infinity)) {
		const replacement = swaps.get(word.text.toLowerCase());
		if (!replacement || replacement === word.text.toLowerCase()) continue;
		out += text.slice(last, word.start) + matchCase(word.text, replacement);
		last = word.start + word.text.length;
		changed = true;
	}
	return changed ? out + text.slice(last) : null;
}
