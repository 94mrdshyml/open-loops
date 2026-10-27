export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
	level: LogLevel;
	event: string;
	route?: string;
	method?: string;
	userId?: string;
	durationMs?: number;
	statusCode?: number;
	meta?: Record<string, unknown>;
	error?: unknown;
}

type LogMeta = Omit<LogEntry, 'level' | 'event'>;

/** Writes one JSON line to the console, which Cloudflare keeps in its logs. */
export async function log(entry: LogEntry): Promise<void> {
	const { level, event, error, ...rest } = entry;
	const line = JSON.stringify({
		at: new Date().toISOString(),
		level,
		event,
		...rest,
		error:
			error instanceof Error
				? { message: error.message, stack: error.stack?.slice(0, 2000) }
				: typeof error === 'string'
					? error
					: undefined
	});
	console[level](line);
}

export const logger = {
	info: (event: string, meta?: LogMeta) => log({ level: 'info', event, ...meta }),
	warn: (event: string, meta?: LogMeta) => log({ level: 'warn', event, ...meta }),
	error: (event: string, meta?: LogMeta) => log({ level: 'error', event, ...meta })
};

export function startTimer(): () => number {
	const start = performance.now();
	return () => Math.round(performance.now() - start);
}
