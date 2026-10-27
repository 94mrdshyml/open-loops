import { error, json } from '@sveltejs/kit';
import { generateRandom } from '$lib/server/db/generate-id';
import { logger, startTimer } from '$lib/server/logger';
import {
	IMAGE_EXTENSIONS,
	detectImageType,
	ownerFolder,
	uploadLimitsFor
} from '$lib/server/upload-rules';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const bucket = platform?.env?.OPENTABS_ASSETS;
	if (!bucket) error(500, 'R2 binding not available');

	const publicUrl = platform?.env?.PUBLIC_R2_PUBLIC_URL;
	if (!publicUrl) error(500, 'PUBLIC_R2_PUBLIC_URL not configured');

	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) error(400, 'No file provided');

	const limits = uploadLimitsFor(locals.user.role);

	if (file.size > limits.maxBytes) {
		logger.warn('r2.upload.validation_failed', {
			route: '/api/upload',
			userId: locals.user.id,
			statusCode: 413,
			meta: { reason: 'file_too_large', contentType: file.type, fileSizeBytes: file.size }
		});
		error(413, `File too large (max ${limits.maxBytes / (1024 * 1024)} MB)`);
	}

	// The type is read from the file itself, never taken from what the sender says it is
	const bytes = await file.arrayBuffer();
	const type = detectImageType(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 16)));
	if (!type) {
		logger.warn('r2.upload.validation_failed', {
			route: '/api/upload',
			userId: locals.user.id,
			statusCode: 415,
			meta: { reason: 'invalid_file_content', contentType: file.type, fileSizeBytes: file.size }
		});
		error(415, 'Unsupported file type');
	}

	// Each person's pictures sit in their own folder, so the number they have can be counted
	const folder = await ownerFolder(locals.user.id);
	if (limits.maxFiles !== null) {
		const existing = await bucket.list({ prefix: `${folder}/`, limit: limits.maxFiles });
		if (existing.objects.length >= limits.maxFiles) {
			logger.warn('r2.upload.validation_failed', {
				route: '/api/upload',
				userId: locals.user.id,
				statusCode: 429,
				meta: { reason: 'upload_limit_reached', limit: limits.maxFiles }
			});
			error(429, 'Upload limit reached. Please ask an admin for help.');
		}
	}

	logger.info('r2.upload.start', {
		route: '/api/upload',
		method: 'POST',
		userId: locals.user.id,
		meta: { contentType: type, fileSizeBytes: file.size }
	});

	const key = `${folder}/${generateRandom()}.${IMAGE_EXTENSIONS[type]}`;
	const elapsed = startTimer();

	try {
		await bucket.put(key, bytes, {
			httpMetadata: { contentType: type }
		});

		const url = `${publicUrl}/${key}`;

		logger.info('r2.upload.success', {
			route: '/api/upload',
			userId: locals.user.id,
			durationMs: elapsed(),
			statusCode: 200,
			meta: { key, fileSizeBytes: file.size, contentType: type, publicUrl: url }
		});

		return json({ url });
	} catch (e) {
		logger.error('r2.upload.failed', {
			route: '/api/upload',
			userId: locals.user.id,
			durationMs: elapsed(),
			statusCode: 500,
			meta: { key, fileSizeBytes: file.size },
			error: e
		});
		throw e;
	}
};
