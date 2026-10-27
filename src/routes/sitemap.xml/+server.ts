import { and, count, eq, gte, isNotNull, max } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { authors, categories, postTags, posts, tags } from '$lib/server/db/schema';
import { MIN_INDEXABLE_TAG_POSTS } from '$lib/utils/seo';
import type { RequestHandler } from './$types';

type Row = { slug: string; updatedAt: Date | null };

function day(date: Date | null): string | null {
	return date ? date.toISOString().split('T')[0] : null;
}

/** One unsafe character (&, <, >, quotes) makes the whole file unreadable to Google. */
function escapeXml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function entry(loc: string, changefreq: string, priority: string, lastmod: string | null): string {
	const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
	return `<url><loc>${escapeXml(loc)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority>${mod}</url>`;
}

// Category slugs are typed by hand in the dashboard, so encode every slug before it goes in a URL.
const seg = encodeURIComponent;

export const GET: RequestHandler = async ({ url }) => {
	const siteUrl = url.origin;
	const published = eq(posts.status, 'published');

	let postRows: Row[];
	let categoryRows: Row[];
	let tagRows: Row[];
	let authorRows: { slug: string | null; updatedAt: Date | null }[];

	try {
		[postRows, categoryRows, tagRows, authorRows] = await Promise.all([
			db.select({ slug: posts.slug, updatedAt: posts.updatedAt }).from(posts).where(published),
			db
				.select({ slug: categories.slug, updatedAt: max(posts.updatedAt) })
				.from(categories)
				.innerJoin(posts, eq(posts.categoryId, categories.id))
				.where(published)
				.groupBy(categories.slug),
			// Tags with only a few posts are thin pages, so they stay out of the sitemap.
			db
				.select({ slug: tags.slug, updatedAt: max(posts.updatedAt) })
				.from(tags)
				.innerJoin(postTags, eq(postTags.tagId, tags.id))
				.innerJoin(posts, eq(postTags.postId, posts.id))
				.where(published)
				.groupBy(tags.slug)
				.having(gte(count(posts.id), MIN_INDEXABLE_TAG_POSTS)),
			db
				.select({ slug: authors.slug, updatedAt: max(posts.updatedAt) })
				.from(authors)
				.innerJoin(posts, eq(posts.authorId, authors.id))
				.where(and(published, isNotNull(authors.slug)))
				.groupBy(authors.slug)
		]);
	} catch (e) {
		// 503 with Retry-After tells Google to come back later instead of marking the sitemap broken.
		console.error('Sitemap DB error:', e);
		return new Response('Sitemap temporarily unavailable', {
			status: 503,
			headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '600' }
		});
	}

	// "Last modified" must be real: the newest post update, never simply today's date.
	const newest = postRows.reduce<Date | null>(
		(latest, p) => (p.updatedAt && (!latest || p.updatedAt > latest) ? p.updatedAt : latest),
		null
	);

	const urls: string[] = [
		entry(`${siteUrl}/`, 'daily', '1.0', day(newest)),
		entry(`${siteUrl}/categories`, 'monthly', '0.7', day(newest)),
		entry(`${siteUrl}/tags`, 'weekly', '0.5', day(newest)),
		entry(`${siteUrl}/about`, 'yearly', '0.5', null),
		...categoryRows.map((c) =>
			entry(`${siteUrl}/categories/${seg(c.slug)}`, 'weekly', '0.7', day(c.updatedAt))
		),
		...tagRows.map((t) =>
			entry(`${siteUrl}/tags/${seg(t.slug)}`, 'weekly', '0.6', day(t.updatedAt))
		),
		...authorRows
			.filter((a): a is { slug: string; updatedAt: Date | null } => a.slug !== null)
			.map((a) => entry(`${siteUrl}/authors/${seg(a.slug)}`, 'weekly', '0.7', day(a.updatedAt))),
		...postRows.map((p) =>
			entry(`${siteUrl}/posts/${seg(p.slug)}`, 'daily', '0.9', day(p.updatedAt))
		)
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=300'
		}
	});
};
