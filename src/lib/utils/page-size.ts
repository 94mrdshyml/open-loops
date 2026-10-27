/** How many stories the home page's Latest list shows, and adds with each "Load more". */
export const DEFAULT_POSTS_PER_PAGE = 12;
export const MIN_POSTS_PER_PAGE = 4;
export const MAX_POSTS_PER_PAGE = 50;

/** Most rows one request may ask for, so a hand-edited address cannot pull the whole site. */
export const MAX_LATEST_ROWS = 300;

/** The saved setting as a usable number: a whole number in range, or the default. */
export function postsPerPage(saved: string | undefined | null): number {
	const n = Number(saved);
	if (!Number.isInteger(n) || n < MIN_POSTS_PER_PAGE || n > MAX_POSTS_PER_PAGE) {
		return DEFAULT_POSTS_PER_PAGE;
	}
	return n;
}

/** True for a whole number the setting accepts. Used to refuse bad input in the dashboard. */
export function isValidPostsPerPage(text: string): boolean {
	return /^\d{1,3}$/.test(text) && postsPerPage(text) === Number(text);
}
