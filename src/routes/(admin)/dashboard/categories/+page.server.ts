import { fail } from '@sveltejs/kit';
import {
	getCategoriesWithCount,
	getCategoryById,
	createCategory,
	updateCategory,
	deleteCategory,
	setHomepageCategory,
	reorderHomepageCategories
} from '$lib/server/queries/categories';
import { instrumentAction } from '$lib/server/instrument-action';
import type { Actions, PageServerLoad } from './$types';

/** Longest short description the dashboard accepts. */
const DESCRIPTION_MAX = 200;

/** The description box as saved text: trimmed, one line of spaces, cut to the limit, or null when empty. */
function readDescription(raw: FormDataEntryValue | null): string | null {
	if (typeof raw !== 'string') return null;
	const text = raw.replace(/\s+/g, ' ').trim().slice(0, DESCRIPTION_MAX);
	return text || null;
}

export const load: PageServerLoad = async () => {
	const categories = await getCategoriesWithCount();
	return { categories };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const data = await request.formData();
		const name = (data.get('name') as string | null)?.trim() ?? '';
		const color = (data.get('color') as string | null)?.trim() ?? '#6b7280';
		const description = readDescription(data.get('description'));

		if (!name) return fail(400, { error: 'Name is required' });

		return instrumentAction(
			'createCategory',
			'/dashboard/categories',
			locals.user?.id,
			async () => {
				const id = await createCategory({ name, color, description });
				return { success: true, id };
			}
		);
	},

	update: async ({ request, locals }) => {
		const data = await request.formData();
		const id = (data.get('id') as string | null)?.trim() ?? '';
		const name = (data.get('name') as string | null)?.trim() ?? '';
		const color = (data.get('color') as string | null)?.trim() ?? '';
		const slug = (data.get('slug') as string | null)?.trim() || undefined;
		const description = readDescription(data.get('description'));

		if (!id) return fail(400, { error: 'Category ID required' });
		if (!name) return fail(400, { error: 'Name is required' });

		return instrumentAction(
			'updateCategory',
			'/dashboard/categories',
			locals.user?.id,
			async () => {
				await updateCategory(id, { name, color: color || undefined, slug, description });
				return { success: true };
			}
		);
	},

	delete: async ({ request, locals }) => {
		const data = await request.formData();
		const id = (data.get('id') as string | null)?.trim() ?? '';
		if (!id) return fail(400, { error: 'Category ID required' });

		return instrumentAction(
			'deleteCategory',
			'/dashboard/categories',
			locals.user?.id,
			async () => {
				await deleteCategory(id);
				return { success: true };
			}
		);
	},

	toggleHome: async ({ request, locals }) => {
		const data = await request.formData();
		const categoryId = (data.get('categoryId') as string | null)?.trim() ?? '';
		if (!categoryId) return fail(400, { error: 'Category ID required' });

		return instrumentAction(
			'toggleHomepageCategory',
			'/dashboard/categories',
			locals.user?.id,
			async () => {
				const cat = await getCategoryById(categoryId);
				if (!cat) return fail(404, { error: 'Category not found' });

				const result = await setHomepageCategory(categoryId, !cat.showOnHome);
				if (!result.ok) {
					return fail(400, {
						error: 'You can only feature up to 5 categories on the homepage.'
					});
				}
				return { success: true };
			}
		);
	},

	reorderHome: async ({ request, locals }) => {
		const data = await request.formData();
		const raw = (data.get('order') as string | null)?.trim() ?? '';
		const ids = raw.split(',').filter(Boolean);

		if (ids.length === 0 || ids.length > 5) return fail(400, { error: 'Invalid order' });

		return instrumentAction(
			'reorderHomepageCategories',
			'/dashboard/categories',
			locals.user?.id,
			async () => {
				await reorderHomepageCategories(ids);
				return { success: true };
			}
		);
	}
};
