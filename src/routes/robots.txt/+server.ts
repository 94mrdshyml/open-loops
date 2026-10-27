import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const siteUrl = url.origin;

	const body = [
		'User-agent: *',
		'Allow: /',
		'Disallow: /dashboard',
		'Disallow: /login',
		'Disallow: /register',
		'Disallow: /profile',
		'Disallow: /unsubscribe',
		'Disallow: /api',
		'',
		`Sitemap: ${siteUrl}/sitemap.xml`
	].join('\n');

	return new Response(body, {
		headers: { 'Content-Type': 'text/plain' }
	});
};
