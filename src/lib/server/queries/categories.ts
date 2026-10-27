import { and, count, eq, max, sql } from 'drizzle-orm';
import { generateId } from '$lib/server/db/generate-id';
import { db } from '$lib/server/db/client';
import { categories, posts } from '$lib/server/db/schema';
import { slugify } from '$lib/utils/slugify';
import type { CategoryWithCount } from '$lib/types/index';

export async function getAllCategories(): Promise<CategoryWithCount[]> {
	const postCount = count(posts.id);
	const rows = await db
		.select({
			id: categories.id,
			name: categories.name,
			slug: categories.slug,
			color: categories.color,
			description: categories.description,
			showOnHome: categories.showOnHome,
			homeOrder: categories.homeOrder,
			postCount
		})
		.from(categories)
		.leftJoin(posts, eq(posts.categoryId, categories.id))
		.groupBy(
			categories.id,
			categories.name,
			categories.slug,
			categories.color,
			categories.description,
			categories.showOnHome,
			categories.homeOrder
		)
		.orderBy(categories.name);

	return rows as CategoryWithCount[];
}

export async function getCategoriesWithCount(): Promise<CategoryWithCount[]> {
	const rows = await db.execute(
		sql`SELECT c.id, c.name, c.slug, c.color, c.description, c.show_on_home, c.home_order, COUNT(p.id)::int AS post_count
        FROM categories c
        LEFT JOIN posts p ON p.category_id = c.id
        GROUP BY c.id, c.name, c.slug, c.color, c.description, c.show_on_home, c.home_order
        ORDER BY c.name`
	);
	return (
		rows.rows as Array<{
			id: string;
			name: string;
			slug: string;
			color: string | null;
			description: string | null;
			show_on_home: boolean;
			home_order: number;
			post_count: number;
		}>
	).map((r) => ({
		id: r.id,
		name: r.name,
		slug: r.slug,
		color: r.color,
		description: r.description,
		showOnHome: r.show_on_home,
		homeOrder: r.home_order,
		postCount: r.post_count
	}));
}

export async function getCategoryById(id: string): Promise<CategoryWithCount | null> {
	const rows = await db.execute(
		sql`SELECT c.id, c.name, c.slug, c.color, c.description, c.show_on_home, c.home_order, COUNT(p.id)::int AS post_count
        FROM categories c
        LEFT JOIN posts p ON p.category_id = c.id
        WHERE c.id = ${id}
        GROUP BY c.id, c.name, c.slug, c.color, c.description, c.show_on_home, c.home_order
        LIMIT 1`
	);
	if (!rows.rows || rows.rows.length === 0) return null;
	const r = rows.rows[0] as {
		id: string;
		name: string;
		slug: string;
		color: string | null;
		description: string | null;
		show_on_home: boolean;
		home_order: number;
		post_count: number;
	};
	return {
		id: r.id,
		name: r.name,
		slug: r.slug,
		color: r.color,
		description: r.description,
		showOnHome: r.show_on_home,
		homeOrder: r.home_order,
		postCount: r.post_count
	};
}

export async function getHomepageCategories(): Promise<CategoryWithCount[]> {
	const rows = await db.execute(
		sql`SELECT c.id, c.name, c.slug, c.color, c.description, c.show_on_home, c.home_order, COUNT(p.id)::int AS post_count
        FROM categories c
        LEFT JOIN posts p ON p.category_id = c.id
        WHERE c.show_on_home = true
        GROUP BY c.id, c.name, c.slug, c.color, c.description, c.show_on_home, c.home_order
        ORDER BY c.home_order ASC
        LIMIT 5`
	);
	return (
		rows.rows as Array<{
			id: string;
			name: string;
			slug: string;
			color: string | null;
			description: string | null;
			show_on_home: boolean;
			home_order: number;
			post_count: number;
		}>
	).map((r) => ({
		id: r.id,
		name: r.name,
		slug: r.slug,
		color: r.color,
		description: r.description,
		showOnHome: r.show_on_home,
		homeOrder: r.home_order,
		postCount: r.post_count
	}));
}

export async function setHomepageCategory(
	id: string,
	show: boolean
): Promise<{ ok: true } | { ok: false; reason: 'limit_reached' }> {
	if (show) {
		const [{ currentCount }] = await db
			.select({ currentCount: count() })
			.from(categories)
			.where(eq(categories.showOnHome, true));

		if (currentCount >= 5) return { ok: false, reason: 'limit_reached' };

		const [{ maxOrder }] = await db
			.select({ maxOrder: max(categories.homeOrder) })
			.from(categories)
			.where(eq(categories.showOnHome, true));

		await db
			.update(categories)
			.set({ showOnHome: true, homeOrder: (maxOrder ?? 0) + 1, updatedAt: new Date() })
			.where(eq(categories.id, id));
	} else {
		await db
			.update(categories)
			.set({ showOnHome: false, updatedAt: new Date() })
			.where(eq(categories.id, id));
	}
	return { ok: true };
}

export async function reorderHomepageCategories(ids: string[]): Promise<void> {
	await Promise.all(
		ids.map((id, i) =>
			db
				.update(categories)
				.set({ homeOrder: i + 1, updatedAt: new Date() })
				.where(and(eq(categories.id, id), eq(categories.showOnHome, true)))
		)
	);
}

async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
	const slug = slugify(base);
	const existing = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
	const slugs = new Set(existing.filter((r) => r.id !== excludeId).map((r) => r.slug));
	if (!slugs.has(slug)) return slug;
	let i = 2;
	while (slugs.has(`${slug}-${i}`)) i++;
	return `${slug}-${i}`;
}

export async function createCategory(data: {
	name: string;
	color: string;
	description?: string | null;
}): Promise<string> {
	const id = generateId('cat');
	const slug = await uniqueCategorySlug(data.name);
	await db.insert(categories).values({
		id,
		name: data.name,
		slug,
		color: data.color,
		description: data.description ?? null
	});
	return id;
}

export async function updateCategory(
	id: string,
	data: Partial<{ name: string; slug: string; color: string; description: string | null }>
): Promise<string> {
	const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
	if (data.name && !data.slug) {
		updateData.slug = await uniqueCategorySlug(data.name, id);
	}
	await db.update(categories).set(updateData).where(eq(categories.id, id));
	return id;
}

export async function deleteCategory(id: string): Promise<{ success: true }> {
	await db.update(posts).set({ categoryId: null }).where(eq(posts.categoryId, id));
	await db.delete(categories).where(eq(categories.id, id));
	return { success: true };
}
