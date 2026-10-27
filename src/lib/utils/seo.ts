/** A tag page is only indexed (and listed in the sitemap) once it holds at least this many posts. */
export const MIN_INDEXABLE_TAG_POSTS = 4;

/** Most tags one post may carry. */
export const MAX_TAGS_PER_POST = 5;

export const META_DESCRIPTION_MAX = 160;

/** Cut text to `max` characters on a word boundary, adding an ellipsis when it was shortened. */
export function clipText(text: string, max: number): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	if (clean.length <= max) return clean;
	const cut = clean.slice(0, max - 1);
	const lastSpace = cut.lastIndexOf(' ');
	return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

/**
 * A JSON-LD block for the page head. The text is put in the page as raw HTML, so every `<` is
 * written as `\u003c`: a title containing `</script>` can then never end the block early.
 */
export function jsonLdScript(data: object): string {
	return (
		'<script type="application/ld+json">' +
		JSON.stringify(data).replace(/</g, '\\u003c') +
		'</' +
		'script>'
	);
}
