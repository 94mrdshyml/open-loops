import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getReadHistory } from '$lib/server/queries/read-history';
import { getUserComments } from '$lib/server/queries/comments';
import { getSavedPosts, unsavePost } from '$lib/server/queries/bookmarks';
import { db } from '$lib/server/db/client';
import { user as userTable } from '$lib/server/db/schema';
import { updateNewsletterSubscription, syncUserToResend } from '$lib/server/resend';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const [readHistory, userComments, savedPosts] = await Promise.all([
		getReadHistory(user.id, 20).catch(() => []),
		getUserComments(user.id).catch(() => []),
		getSavedPosts(user.id).catch(() => [])
	]);
	return { user, readHistory, userComments, savedPosts };
};

export const actions: Actions = {
	unsavePost: async ({ locals, request }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Unauthorised' });
		const data = await request.formData();
		const postSlug = data.get('postSlug') as string | null;
		if (!postSlug) return fail(400, { error: 'Missing postSlug' });
		await unsavePost(user.id, postSlug);
		return { unsaved: true };
	},

	toggleNewsletter: async ({ locals, platform }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Unauthorised' });

		const subscribe = !user.isNewsletterSubscriber;
		const now = new Date();

		await db
			.update(userTable)
			.set({
				isNewsletterSubscriber: subscribe,
				newsletterSubscribedAt: subscribe ? now : null,
				newsletterSource: subscribe ? 'manual' : null
			})
			.where(eq(userTable.id, user.id));

		// waitUntil keeps this alive past the response — plain fire-and-forget
		// gets killed by the Workers runtime once the response is sent.
		if (user.resendContactId) {
			platform?.ctx.waitUntil(updateNewsletterSubscription(user.resendContactId, subscribe));
		} else if (subscribe) {
			platform?.ctx.waitUntil(
				(async () => {
					const contactId = await syncUserToResend({
						email: user.email,
						firstName: user.firstName,
						lastName: user.lastName,
						isNewsletterSubscriber: true
					});
					if (contactId) {
						await db
							.update(userTable)
							.set({ resendContactId: contactId })
							.where(eq(userTable.id, user.id));
					}
				})()
			);
		}

		return { toggled: true, subscribed: subscribe };
	}
};
