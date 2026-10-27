import { fail } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { instrumentAction } from '$lib/server/instrument-action';
import { isSecureWebAddress } from '$lib/utils/web-address';
import type { Actions } from './$types';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

interface FieldErrors {
	firstName?: string;
	lastName?: string;
	username?: string;
	avatarUrl?: string;
}

// The signed-in user already comes down from the dashboard layout, so there is no load here.
// Every dashboard role (admin and author) can reach this page; hooks.server.ts keeps readers out.
export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		return instrumentAction('updateProfile', '/dashboard/account', userId, async () => {
			const firstName = data.get('firstName')?.toString().trim() ?? '';
			const lastName = data.get('lastName')?.toString().trim() ?? '';
			const username = data.get('username')?.toString().trim() ?? '';

			const errors: FieldErrors = {};

			if (!firstName) errors.firstName = 'First name is required.';
			if (!lastName) errors.lastName = 'Last name is required.';
			if (!USERNAME_RE.test(username))
				errors.username = 'Only lowercase letters, numbers and underscores. 3–20 characters.';

			if (Object.keys(errors).length > 0) return fail(400, { errors });

			// Uniqueness: exclude the current user
			const [conflict] = await db
				.select({ id: userTable.id })
				.from(userTable)
				.where(and(eq(userTable.username, username), ne(userTable.id, userId)))
				.limit(1);

			if (conflict) return fail(400, { errors: { username: 'Username is taken.' } });

			await db
				.update(userTable)
				.set({
					firstName,
					lastName,
					username,
					name: `${firstName} ${lastName}`,
					updatedAt: new Date()
				})
				.where(eq(userTable.id, userId));

			return { success: true };
		});
	},

	updateAvatar: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		return instrumentAction('updateAvatar', '/dashboard/account', userId, async () => {
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
		});
	}
};
