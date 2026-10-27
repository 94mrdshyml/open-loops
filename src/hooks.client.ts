import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, event, status, message }) => {
	console.error('[client error]', status, event.url.pathname, message, error);
};
