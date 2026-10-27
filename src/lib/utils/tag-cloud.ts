import type { TagCount } from '$lib/types/index';

/** Tags with fewer stories than this stay out of the cloud (they are still in the A to Z list). */
export const MIN_CLOUD_STORIES = 2;

/** Size steps in the cloud, 1 (smallest) to 5 (largest). */
export const CLOUD_TIERS = 5;

export interface CloudTag extends TagCount {
	tier: number;
}

export interface TagLetterGroup {
	/** "A" to "Z", or "#" for names that start with a digit or symbol. */
	letter: string;
	tags: TagCount[];
}

/** A fixed number from a word, so the cloud keeps the same mix on every visit. */
function scatter(word: string): number {
	let hash = 2166136261;
	for (let i = 0; i < word.length; i++) {
		hash ^= word.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

/**
 * The tags for the cloud: those with enough stories, each given a size step from how its story
 * count sits between the smallest and largest (on a log scale, so one very busy tag does not
 * shrink the rest to nothing). The order is a fixed shuffle, so big and small words mix evenly.
 */
export function buildTagCloud(all: TagCount[]): CloudTag[] {
	const chosen = all.filter((t) => t.postCount >= MIN_CLOUD_STORIES);
	if (chosen.length === 0) return [];

	const counts = chosen.map((t) => t.postCount);
	const low = Math.log(Math.min(...counts));
	const high = Math.log(Math.max(...counts));
	const span = high - low;

	return chosen
		.map((t) => {
			const share = span === 0 ? 0.5 : (Math.log(t.postCount) - low) / span;
			return { ...t, tier: Math.min(CLOUD_TIERS, 1 + Math.floor(share * CLOUD_TIERS)) };
		})
		.sort((a, b) => scatter(a.slug) - scatter(b.slug) || a.slug.localeCompare(b.slug));
}

function letterOf(name: string): string {
	const first = name.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
	return first >= 'A' && first <= 'Z' ? first : '#';
}

/** Every tag, grouped under its first letter (digits and symbols under "#"), each group A to Z. */
export function groupTagsByLetter(all: TagCount[]): TagLetterGroup[] {
	const groups = new Map<string, TagCount[]>();
	for (const tag of all) {
		const letter = letterOf(tag.name);
		groups.set(letter, [...(groups.get(letter) ?? []), tag]);
	}
	return [...groups.entries()]
		.sort(([a], [b]) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b)))
		.map(([letter, tags]) => ({
			letter,
			tags: tags.sort((a, b) =>
				a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true })
			)
		}));
}
