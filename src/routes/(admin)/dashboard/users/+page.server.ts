import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { getAllUsers, updateUserRole, deleteUser } from '$lib/server/queries/users';
import { ensureAuthorProfile } from '$lib/server/queries/authors';
import type { UserRole } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

const VALID_ROLES: UserRole[] = ['reader', 'author', 'admin'];

export const load: PageServerLoad = async ({ locals }) => {
	const users = await getAllUsers();
	return { users, currentUserId: locals.user?.id ?? null };
};

export const actions: Actions = {
	updateRole: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const userId = data.get('userId') as string | null;
		const role = data.get('role') as string | null;

		if (!userId || !role) return fail(400, { error: 'Missing fields' });
		if (!VALID_ROLES.includes(role as UserRole)) return fail(400, { error: 'Invalid role' });
		if (userId === locals.user.id) return fail(400, { error: 'Cannot change your own role' });

		try {
			await updateUserRole(userId, role as UserRole);
			if (role === 'author' || role === 'admin') {
				const [targetUser] = await db
					.select({ name: userTable.name })
					.from(userTable)
					.where(eq(userTable.id, userId))
					.limit(1);
				if (targetUser) {
					await ensureAuthorProfile(userId, targetUser.name);
				}
			}
		} catch {
			return fail(500, { error: 'Failed to update role' });
		}
	},

	deleteUser: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const userId = data.get('userId') as string | null;

		if (!userId) return fail(400, { error: 'Missing userId' });
		if (userId === locals.user.id) return fail(400, { error: 'Cannot delete your own account' });

		try {
			await deleteUser(userId);
		} catch {
			return fail(500, { error: 'Failed to delete user' });
		}
	}
};
