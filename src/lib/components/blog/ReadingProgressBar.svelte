<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		articleEl: HTMLElement | null;
	}

	let { articleEl }: Props = $props();

	let progress = $state(0);
	let visible = $state(false);

	function updateProgress() {
		if (!articleEl) return;

		const rect = articleEl.getBoundingClientRect();
		const articleHeight = articleEl.offsetHeight;
		const scrolled = -rect.top;
		const total = articleHeight - window.innerHeight;

		if (total <= 0) {
			progress = 0;
			visible = false;
			return;
		}

		const pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
		progress = pct;
		visible = pct > 0 && pct < 100;
	}

	let cleanup: (() => void) | undefined;

	onMount(() => {
		if (window.innerHeight < 500) return;
		window.addEventListener('scroll', updateProgress, { passive: true });
		updateProgress();
		cleanup = () => window.removeEventListener('scroll', updateProgress);
	});

	onDestroy(() => {
		cleanup?.();
	});
</script>

{#if visible}
	<div class="progress-bar" style="transform: scaleX({progress / 100})" aria-hidden="true"></div>
{/if}

<style>
	.progress-bar {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 3px;
		background: var(--accent);
		transform-origin: left;
		z-index: 100;
		transition: transform 80ms linear;
		pointer-events: none;
	}
</style>
