import { redirect } from '@sveltejs/kit';
import { getEmailSendById } from '$lib/server/queries/email-sends';
import { getResendClient } from '$lib/server/resend';
import type { GetEmailResponseSuccess } from 'resend';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (locals.user?.role !== 'admin') redirect(302, '/dashboard');

	const send = await getEmailSendById(params.id);
	if (!send) redirect(302, '/dashboard/emails');

	let resendData: GetEmailResponseSuccess | null = null;
	if (send.resendEmailId) {
		try {
			const resend = await getResendClient();
			if (resend) {
				const { data } = await resend.emails.get(send.resendEmailId);
				resendData = data ?? null;
			}
		} catch {
			// unavailable — show DB data only
		}
	}

	return { send, resendData };
};
