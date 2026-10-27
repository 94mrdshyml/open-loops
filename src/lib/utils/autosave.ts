export interface AutosaveOptions {
	/** How long to wait after the last change before saving. */
	delayMs: number;
	/** Starts a save. */
	submit: () => void;
	/** True while a save is already running. A new one never starts on top of it. */
	busy: () => boolean;
	/** True when there is something that has not been saved. */
	dirty: () => boolean;
}

export interface Autosave {
	/** Call after every change. Restarts the wait. */
	schedule: () => void;
	/** Save now if there is anything to save (used when the tab is put in the background). */
	flush: () => void;
	/** Forget any save that is waiting (used when the writer saves or publishes themselves). */
	cancel: () => void;
}

const RETRY_WHILE_BUSY_MS = 500;

/**
 * Saves a form a little while after the writer stops changing it. If a save is still running when
 * the wait ends, it tries again shortly after, so two saves are never in flight together. That
 * matters for a new story, where the first save creates it.
 */
export function createAutosave(options: AutosaveOptions): Autosave {
	let timer: ReturnType<typeof setTimeout> | undefined;

	function run() {
		timer = undefined;
		if (options.busy()) {
			timer = setTimeout(run, RETRY_WHILE_BUSY_MS);
			return;
		}
		if (options.dirty()) options.submit();
	}

	return {
		schedule() {
			clearTimeout(timer);
			timer = setTimeout(run, options.delayMs);
		},
		flush() {
			clearTimeout(timer);
			run();
		},
		cancel() {
			clearTimeout(timer);
			timer = undefined;
		}
	};
}
