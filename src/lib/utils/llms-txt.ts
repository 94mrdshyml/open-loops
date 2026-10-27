import { clipText, META_DESCRIPTION_MAX } from '$lib/utils/seo';

export interface LlmsCategory {
	name: string;
	slug: string;
	postCount: number;
}

export interface LlmsStory {
	slug: string;
	title: string;
	subtitle: string | null;
	publishedAt: Date | null;
	categoryName: string | null;
}

export interface LlmsInput {
	origin: string;
	siteName: string;
	categories: LlmsCategory[];
	stories: LlmsStory[];
}

/** Text that sits inside a Markdown link label or line: one line, no stray brackets. */
function plain(text: string): string {
	return text
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/[[\]\\]/g, (ch) => `\\${ch}`);
}

function day(date: Date): string {
	return date.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

/**
 * The text of /llms.txt: a short guide to the site written for AI tools, in the layout the
 * llms.txt proposal describes (a title, a one-line summary, then lists of links with a note).
 */
export function buildLlmsTxt({ origin, siteName, categories, stories }: LlmsInput): string {
	const topics = categories.map(
		(c) =>
			`- [${plain(c.name)}](${origin}/categories/${encodeURIComponent(c.slug)}): ${c.postCount} ${
				c.postCount === 1 ? 'story' : 'stories'
			}`
	);

	const latest = stories.map((s) => {
		const bits = [
			s.subtitle ? clipText(plain(s.subtitle), META_DESCRIPTION_MAX) : '',
			[s.categoryName ? plain(s.categoryName) : '', s.publishedAt ? day(s.publishedAt) : '']
				.filter(Boolean)
				.join(', ')
		].filter(Boolean);
		const note = bits.length > 0 ? `: ${bits[0]}${bits[1] ? ` (${bits[1]})` : ''}` : '';
		return `- [${plain(s.title)}](${origin}/posts/${encodeURIComponent(s.slug)})${note}`;
	});

	const lines = [
		`# ${plain(siteName)}`,
		'',
		'> Open Tabs is an explainer blog on business, politics and geopolitics, written through a money lens, with an Indian focus and a global scope. It is published by IndexDaily Media in Delhi. Founder and main writer: Anurag Singh Jakhar.',
		'',
		'Stories are long reads, mostly 4 to 10 minutes, written in British English. Many open with an "In brief" box that gives the main points. Every story has a page of its own, grouped by topic.',
		'',
		'## About',
		'',
		`- [About Open Tabs](${origin}/about): what Open Tabs is, why it was created and what to expect`,
		'',
		'## Topics',
		'',
		...topics,
		'',
		'## Latest stories',
		'',
		...latest,
		'',
		'## Optional',
		'',
		`- [All topics](${origin}/categories): the full list of topics`,
		`- [Sitemap](${origin}/sitemap.xml): every published page`,
		`- [RSS feed](${origin}/feed.xml): the newest stories`,
		''
	];

	return lines.join('\n');
}
