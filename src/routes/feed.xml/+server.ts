import { getPosts } from '$lib/server/queries/posts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const origin = url.origin;
	const posts = await getPosts({ limit: 20 });

	const items = posts
		.map((post) => {
			const link = `${origin}/posts/${post.slug}`;
			const description = post.subtitle ?? '';
			const pubDate = post.publishedAt?.toUTCString() ?? '';
			const category = post.category ? `<category>${escapeXml(post.category.name)}</category>` : '';
			return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
      ${category}
    </item>`;
		})
		.join('\n');

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Open Tabs</title>
    <link>${origin}</link>
    <description>Clarity on business, politics, and geopolitics.</description>
    <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

	return new Response(rss, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=1800'
		}
	});
};

function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}
