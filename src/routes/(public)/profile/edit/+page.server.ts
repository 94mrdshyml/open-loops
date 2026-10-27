import { fail, redirect } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { isSecureWebAddress } from '$lib/utils/web-address';
import type { Actions, PageServerLoad } from './$types';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export const load: PageServerLoad = async ({ locals }) => {
	return { user: locals.user! };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const role = locals.user!.role;

		if (role === 'admin' || role === 'author') {
			return fail(403, {
				errors: { general: 'Admins and authors cannot edit their profile here.' }
			});
		}

		const data = await request.formData();

		const firstName = data.get('firstName')?.toString().trim() ?? '';
		const lastName = data.get('lastName')?.toString().trim() ?? '';
		const username = data.get('username')?.toString().trim() ?? '';

		type FieldErrors = { firstName?: string; lastName?: string; username?: string };
		const errors: FieldErrors = {};

		if (!firstName) errors.firstName = 'First name is required.';
		if (!lastName) errors.lastName = 'Last name is required.';
		if (!USERNAME_RE.test(username))
			errors.username = 'Only lowercase letters, numbers and underscores. 3–20 characters.';

		if (Object.keys(errors).length > 0) return fail(400, { errors });

		// Uniqueness — exclude current user
		const [conflict] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(and(eq(userTable.username, username), ne(userTable.id, userId)))
			.limit(1);

		if (conflict) return fail(400, { errors: { username: 'Username is taken.' } });

		await db
			.update(userTable)
			.set({ firstName, lastName, username, updatedAt: new Date() })
			.where(eq(userTable.id, userId));

		redirect(302, '/profile');
	},

	updateAvatar: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const avatarUrl = data.get('avatarUrl')?.toString().trim() ?? '';

		if (!avatarUrl) return fail(400, { errors: { avatarUrl: 'Avatar URL required.' } });
		if (!isSecureWebAddress(avatarUrl)) {
			return fail(400, {
				errors: { avatarUrl: 'Use a picture address that starts with https://.' }
			});
		}

		await db
			.update(userTable)
			.set({ avatarUrl, updatedAt: new Date() })
			.where(eq(userTable.id, userId));

		return { success: true };
	}
};
