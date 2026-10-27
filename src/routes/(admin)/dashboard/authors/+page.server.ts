import { fail } from '@sveltejs/kit';
import {
	getAllAuthorsWithPostCount,
	createAuthor,
	updateAuthor,
	deleteAuthor
} from '$lib/server/queries/authors';
import { instrumentAction } from '$lib/server/instrument-action';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const authors = await getAllAuthorsWithPostCount();
	return { authors };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const data = await request.formData();
		const name = (data.get('name') as string | null)?.trim() ?? '';
		const publicName = (data.get('publicName') as string | null)?.trim().slice(0, 100) || null;
		const bio = (data.get('bio') as string | null)?.trim() || null;
		const role = (data.get('role') as string | null) ?? 'writer';
		const avatarUrl = (data.get('avatarUrl') as string | null)?.trim() || null;

		if (!name) return fail(400, { error: 'Name is required' });

		return instrumentAction('createAuthor', '/dashboard/authors', locals.user?.id, async () => {
			const id = await createAuthor({ displayName: name, publicName, bio, role, avatarUrl });
			return { success: true, id };
		});
	},

	update: async ({ request, locals }) => {
		const data = await request.formData();
		const id = (data.get('id') as string | null)?.trim() ?? '';
		const name = (data.get('name') as string | null)?.trim() ?? '';
		const publicName = (data.get('publicName') as string | null)?.trim().slice(0, 100) || null;
		const bio = (data.get('bio') as string | null)?.trim() || null;
		const role = (data.get('role') as string | null) ?? 'writer';
		const avatarUrl = (data.get('avatarUrl') as string | null)?.trim() || null;

		if (!id) return fail(400, { error: 'Author ID required' });
		if (!name) return fail(400, { error: 'Name is required' });

		return instrumentAction('updateAuthor', '/dashboard/authors', locals.user?.id, async () => {
			await updateAuthor(id, { displayName: name, publicName, bio, role, avatarUrl });
			return { success: true };
		});
	},

	delete: async ({ request, locals }) => {
		const data = await request.formData();
		const id = (data.get('id') as string | null)?.trim() ?? '';
		if (!id) return fail(400, { error: 'Author ID required' });

		return instrumentAction('deleteAuthor', '/dashboard/authors', locals.user?.id, async () => {
			const result = await deleteAuthor(id);
			if ('error' in result) return fail(400, { error: result.error });
			return { success: true };
		});
	}
};
