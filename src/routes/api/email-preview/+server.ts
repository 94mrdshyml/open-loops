import { json } from '@sveltejs/kit';
import { render } from '@react-email/components';
import { env } from '$env/dynamic/private';
import NewsletterWelcome from '$lib/email/newsletter-welcome';
import RegistrationWelcome from '$lib/email/registration-welcome';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role === 'reader') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json()) as {
		type?: string;
		headline?: string;
		bodyText?: string;
	};
	const { type = 'newsletter', headline, bodyText } = body;
	const siteUrl = env.PUBLIC_SITE_URL ?? 'https://blog.indexdaily.in';

	try {
		const html =
			type === 'registration'
				? await render(RegistrationWelcome({ firstName: 'Reader', siteUrl }))
				: await render(
						NewsletterWelcome({ firstName: 'Reader', headline, bodyText, siteUrl })
					);
		return json({ html });
	} catch {
		return json({ error: 'Render failed' }, { status: 500 });
	}
};
