import { browser } from '$app/environment';
import { writable } from 'svelte/store';

type Theme = 'light' | 'dark';

function createTheme() {
	let initial: Theme = 'light';
	if (browser) {
		const stored = localStorage.getItem('open-tabs-theme');
		if (stored === 'dark') initial = 'dark';
	}

	const { subscribe, update } = writable<Theme>(initial);

	function toggle() {
		update((current) => {
			const next: Theme = current === 'dark' ? 'light' : 'dark';
			if (browser) {
				localStorage.setItem('open-tabs-theme', next);
				const root = document.documentElement;
				if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
					root.classList.add('theme-fade');
					setTimeout(() => root.classList.remove('theme-fade'), 220);
				}
				root.setAttribute('data-theme', next);
			}
			return next;
		});
	}

	return { subscribe, toggle };
}

export const theme = createTheme();
