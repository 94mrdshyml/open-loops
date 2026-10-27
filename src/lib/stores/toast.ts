import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
	id: string;
	type: ToastType;
	message: string;
}

const { subscribe, update } = writable<ToastItem[]>([]);

function add(type: ToastType, message: string) {
	const id = Math.random().toString(36).slice(2);
	update((items) => [...items, { id, type, message }]);
	setTimeout(() => {
		update((items) => items.filter((t) => t.id !== id));
	}, 4000);
}

export const toastStore = { subscribe };

export const toast = {
	success: (message: string) => add('success', message),
	error: (message: string) => add('error', message),
	info: (message: string) => add('info', message),
	dismiss: (id: string) => update((items) => items.filter((t) => t.id !== id))
};
