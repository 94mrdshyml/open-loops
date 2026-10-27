import { isRedirect } from '@sveltejs/kit';
import { logger, startTimer } from './logger';

export async function instrumentAction<T>(
	actionName: string,
	route: string,
	userId: string | undefined,
	fn: () => Promise<T>
): Promise<T> {
	const elapsed = startTimer();
	try {
		const result = await fn();
		logger.info(`action.${actionName}`, { route, userId, durationMs: elapsed(), statusCode: 200 });
		return result;
	} catch (e) {
		if (isRedirect(e)) throw e;
		logger.error(`action.${actionName}.failed`, { route, userId, durationMs: elapsed(), error: e });
		throw e;
	}
}
