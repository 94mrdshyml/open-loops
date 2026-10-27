import { fail } from '@sveltejs/kit';
import {
	getAllTagsWithCounts,
	getTagById,
	mergeTag,
	updateTag,
	deleteTag
} from '$lib/server/queries/tags';
import { instrumentAction } from '$lib/server/instrument-action';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const tags = await getAllTagsWithCounts();
	return { tags };
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		const data = await request.formData();
		const id = (data.get('id') as string | null)?.trim() ?? '';
		const name = (data.get('name') as string | null)?.trim() ?? '';

		if (!id) return fail(400, { error: 'Tag ID required' });
		if (!name) return fail(400, { error: 'Name is required' });

		return instrumentAction('updateTag', '/dashboard/tags', locals.user?.id, async () => {
			await updateTag(id, { name });
			return { success: true };
		});
	},

	merge: async ({ request, locals }) => {
		const data = await request.formData();
		const sourceId = (data.get('sourceId') as string | null)?.trim() ?? '';
		const targetId = (data.get('targetId') as string | null)?.trim() ?? '';

		if (!sourceId || !targetId) return fail(400, { error: 'Pick a tag to merge into' });
		if (sourceId === targetId) return fail(400, { error: 'Cannot merge a tag into itself' });

		const [source, target] = await Promise.all([getTagById(sourceId), getTagById(targetId)]);
		if (!source || !target) return fail(404, { error: 'Tag not found' });

		return instrumentAction('mergeTag', '/dashboard/tags', locals.user?.id, async () => {
			await mergeTag(sourceId, targetId);
			return { success: true };
		});
	},

	delete: async ({ request, locals }) => {
		const data = await request.formData();
		const id = (data.get('id') as string | null)?.trim() ?? '';
		if (!id) return fail(400, { error: 'Tag ID required' });

		return instrumentAction('deleteTag', '/dashboard/tags', locals.user?.id, async () => {
			await deleteTag(id);
			return { success: true };
		});
	}
};
