import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { authors, categories, postTags, posts, tags } from '$lib/server/db/schema';
import { authorPublicName } from '$lib/server/queries/authors';
import type { PostListItem } from '$lib/types/index';
import { applySwaps, cleanSearchText, fixableWords } from '$lib/utils/search-text';

const listSelect = {
	slug: posts.slug,
	title: posts.title,
	subtitle: posts.subtitle,
	coverImageUrl: posts.featuredImage,
	publishedAt: posts.publishedAt,
	readingTimeMinutes: posts.readingTime,
	categoryName: categories.name,
	categorySlug: categories.slug,
	categoryColor: categories.color,
	authorName: authorPublicName,
	authorAvatarUrl: authors.avatarUrl,
	authorSlug: authors.slug,
	authorBio: authors.bio,
	authorRole: authors.role
};

type ListRow = {
	slug: string;
	title: string;
	subtitle: string | null;
	coverImageUrl: string | null;
	publishedAt: Date | null;
	readingTimeMinutes: number | null;
	categoryName: string | null;
	categorySlug: string | null;
	categoryColor: string | null;
	authorName: string | null;
	authorAvatarUrl: string | null;
	authorSlug: string | null;
	authorBio: string | null;
	authorRole: string | null;
};

function toListItem(row: ListRow): PostListItem {
	return {
		slug: row.slug,
		title: row.title,
		subtitle: row.subtitle,
		coverImageUrl: row.coverImageUrl,
		publishedAt: row.publishedAt,
		readingTimeMinutes: row.readingTimeMinutes,
		category:
			row.categoryName && row.categorySlug
				? { name: row.categoryName, slug: row.categorySlug, color: row.categoryColor }
				: null,
		author: row.authorName
			? {
					name: row.authorName,
					avatarUrl: row.authorAvatarUrl,
					slug: row.authorSlug,
					bio: row.authorBio,
					role: row.authorRole
				}
			: null
	};
}

/**
 * What a search looks in for one story: its own text (title, subtitle, excerpt, In brief and
 * story text, already weighted by the database) plus the topic name, the author's public name
 * and the tags. A word typed by the reader can be found in any of these.
 */
const searchable = sql`(${posts.searchVector} || setweight(to_tsvector('english', search_unaccent(
	coalesce(${categories.name}, '') || ' ' || coalesce(${authorPublicName}, '') || ' ' ||
	coalesce((
		SELECT string_agg(${tags.name}, ' ')
		FROM ${postTags} INNER JOIN ${tags} ON ${tags.id} = ${postTags.tagId}
		WHERE ${postTags.postId} = ${posts.id}
	), ''))), 'B'))`;

/**
 * The reader's text as a database search. Words must all be found, in any order. "Quoted words"
 * must be found together, a minus sign leaves a word out and OR allows either. Plain words also
 * match their other forms (price, prices; refine, refined), and accents are ignored.
 */
function asQuery(text: string) {
	return sql`websearch_to_tsquery('english', search_unaccent(${text}))`;
}

export interface SearchPage {
	posts: PostListItem[];
	/** How many stories match in all, not only on this page. */
	total: number;
}

/**
 * Published stories that contain every word of the search, best match first. A word in the title
 * counts most, then the subtitle, then the excerpt and In brief, then the story text. A story
 * with the whole search in its title comes before one that only has the words scattered. Equal
 * matches go newest first.
 */
export async function searchPosts(
	query: string,
	{ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<SearchPage> {
	const text = cleanSearchText(query);
	if (text.length < 2) return { posts: [], total: 0 };

	const rank = sql<number>`ts_rank_cd(${searchable}, ${asQuery(text)}, 1) +
		(CASE WHEN position(lower(search_unaccent(${text})) in lower(search_unaccent(${posts.title}))) > 0
			THEN 0.5 ELSE 0 END)`;
	const matches = and(eq(posts.status, 'published'), sql`${searchable} @@ ${asQuery(text)}`);

	const [rows, totals] = await Promise.all([
		db
			.select({ ...listSelect, rank: rank.as('rank') })
			.from(posts)
			.leftJoin(categories, eq(posts.categoryId, categories.id))
			.leftJoin(authors, eq(posts.authorId, authors.id))
			.where(matches)
			.orderBy(sql`rank DESC`, desc(posts.publishedAt), desc(posts.id))
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(posts)
			.leftJoin(categories, eq(posts.categoryId, categories.id))
			.leftJoin(authors, eq(posts.authorId, authors.id))
			.where(matches)
	]);

	return { posts: (rows as ListRow[]).map(toListItem), total: totals[0]?.total ?? 0 };
}

/**
 * For a search that found nothing: the same search with each word that matches nothing swapped
 * for the closest word used on the site (one or two letters away), or null when there is nothing
 * to fix. Words that are real words on the site, or other forms of one, are never touched, and
 * neither are quoted phrases and words with a minus sign.
 */
export async function correctedSearch(query: string): Promise<string | null> {
	const text = cleanSearchText(query);
	const words = fixableWords(text);
	if (words.length === 0) return null;

	// ts_stat lists every word in a column of search text, with how many stories use it
	const result = await db.execute(sql`
		WITH
			typed AS (
				SELECT DISTINCT search_unaccent(lower(w)) AS word
				FROM jsonb_array_elements_text(${JSON.stringify(words.map((w) => w.text))}::jsonb) AS w
			),
			stems AS (
				SELECT word FROM ts_stat('SELECT search_vector FROM posts WHERE status = ''published''')
			),
			used AS (
				SELECT word, ndoc FROM ts_stat('SELECT search_words FROM posts WHERE status = ''published''')
				UNION ALL
				SELECT lower(part), 1 FROM (
					SELECT regexp_split_to_table(search_unaccent(name), '[^[:alnum:]]+') AS part FROM categories
					UNION ALL
					SELECT regexp_split_to_table(search_unaccent(name), '[^[:alnum:]]+') FROM tags
					UNION ALL
					SELECT regexp_split_to_table(search_unaccent(coalesce(public_name, display_name)), '[^[:alnum:]]+') FROM authors
				) AS names WHERE length(part) >= 3
			),
			vocabulary AS (SELECT word, max(ndoc) AS ndoc FROM used GROUP BY word),
			unknown AS (
				SELECT word FROM typed
				WHERE cardinality(coalesce(ts_lexize('english_stem', word), '{}')) > 0
					AND NOT EXISTS (SELECT 1 FROM vocabulary v WHERE v.word = typed.word)
					AND NOT EXISTS (SELECT 1 FROM stems s WHERE s.word = (ts_lexize('english_stem', typed.word))[1])
			)
		SELECT unknown.word AS typed, closest.word AS suggestion
		FROM unknown
		INNER JOIN LATERAL (
			-- Two neighbouring letters swapped (adnai for adani) count as one slip, not two
			SELECT v.word FROM vocabulary v
			CROSS JOIN LATERAL (
				SELECT CASE
					WHEN length(v.word) = length(unknown.word)
						AND levenshtein(v.word, unknown.word) = 2
						AND (SELECT string_agg(c, '' ORDER BY c) FROM regexp_split_to_table(v.word, '') AS c)
							= (SELECT string_agg(c, '' ORDER BY c) FROM regexp_split_to_table(unknown.word, '') AS c)
					THEN 1
					ELSE levenshtein(v.word, unknown.word)
				END AS slips
			) AS d
			WHERE abs(length(v.word) - length(unknown.word)) <= 2
				AND d.slips <= CASE WHEN length(unknown.word) >= 5 THEN 2 ELSE 1 END
			ORDER BY d.slips, v.ndoc DESC, v.word
			LIMIT 1
		) AS closest ON true`);

	const swaps = new Map<string, string>();
	for (const row of result.rows as { typed: string; suggestion: string }[]) {
		swaps.set(row.typed, row.suggestion);
	}
	return swaps.size > 0 ? applySwaps(text, swaps) : null;
}
