import { fail } from '@sveltejs/kit';
import {
	getAllComments,
	approveComment,
	rejectComment,
	deleteComment
} from '$lib/server/queries/comments';
import type { CommentStatus } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 30;

export const load: PageServerLoad = async ({ url }) => {
	const status = (url.searchParams.get('status') as CommentStatus | null) || undefined;
	const search = url.searchParams.get('search') || undefined;
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));

	const { rows, total } = await getAllComments({
		status,
		search,
		limit: PAGE_SIZE,
		offset: (page - 1) * PAGE_SIZE
	});

	return {
		comments: rows,
		totalCount: total,
		totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		page,
		filters: { status: status ?? null, search: search ?? null }
	};
};

export const actions: Actions = {
	approve: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string | null;
		if (!id) return fail(400, { error: 'Missing comment id' });
		try {
			await approveComment(id);
		} catch {
			return fail(500, { error: 'Failed to approve comment' });
		}
	},

	reject: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string | null;
		if (!id) return fail(400, { error: 'Missing comment id' });
		try {
			await rejectComment(id);
		} catch {
			return fail(500, { error: 'Failed to reject comment' });
		}
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string | null;
		if (!id) return fail(400, { error: 'Missing comment id' });
		try {
			await deleteComment(id);
		} catch {
			return fail(500, { error: 'Failed to delete comment' });
		}
	}
};
