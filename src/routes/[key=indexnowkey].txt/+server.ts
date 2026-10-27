import { error } from '@sveltejs/kit';
import { getSettingValue } from '$lib/server/queries/settings';
import type { RequestHandler } from './$types';

// Search engines open /{key}.txt to check that the site really owns the key.
export const GET: RequestHandler = async ({ params }) => {
	const key = await getSettingValue('indexnow_key');
	if (!key || key !== params.key) error(404, 'Not found');
	return new Response(key, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
	});
};
