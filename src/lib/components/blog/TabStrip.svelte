<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { CategoryWithCount } from '$lib/types/index';

	interface Props {
		categories: CategoryWithCount[];
		/** True on the front page, which is the open tab when no category is. */
		isHome: boolean;
		/** Slug of the category that is the open tab, if any. */
		openSlug: string | null;
		label: string;
		/** The slim bar copy: no line of its own, and the open tab sits on the bar's edge. */
		dock?: boolean;
	}

	let { categories, isHome, openSlug, label, dock = false }: Props = $props();

	let scroller = $state<HTMLElement | null>(null);
	let canPrev = $state(false);
	let canNext = $state(false);

	/** Room kept clear at each end for an arrow button, so the open tab never hides under one. */
	function arrowRoom(): number {
		return window.matchMedia('(max-width: 639px)').matches ? 44 : 52;
	}

	function reducedMotion(): boolean {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function measure() {
		if (!scroller) return;
		const max = scroller.scrollWidth - scroller.clientWidth;
		canPrev = scroller.scrollLeft > 4;
		canNext = scroller.scrollLeft < max - 4;
	}

	function nudge(direction: 1 | -1) {
		scroller?.scrollBy({
			left: direction * scroller.clientWidth * 0.7,
			behavior: reducedMotion() ? 'auto' : 'smooth'
		});
	}

	/** Bring the open tab fully into view, without moving the page up or down. */
	function revealOpenTab(smooth: boolean) {
		const tab = scroller?.querySelector<HTMLElement>('[aria-current="page"]');
		if (!scroller || !tab) return;
		const max = scroller.scrollWidth - scroller.clientWidth;
		if (max <= 0) return;
		const left = tab.offsetLeft;
		const right = left + tab.offsetWidth;
		const seen = scroller.scrollLeft;
		const room = arrowRoom();
		if (left >= seen + room && right <= seen + scroller.clientWidth - room) return;
		const target = Math.min(max, Math.max(0, left - (scroller.clientWidth - tab.offsetWidth) / 2));
		scroller.scrollTo({ left: target, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
	}

	onMount(() => {
		measure();
		revealOpenTab(false);
		if (!scroller) return;
		const watcher = new ResizeObserver(() => {
			measure();
			revealOpenTab(false);
		});
		watcher.observe(scroller);
		return () => watcher.disconnect();
	});

	// A new page, or a new list of categories, means a new open tab to show.
	$effect(() => {
		void openSlug;
		void isHome;
		void categories.length;
		tick().then(() => {
			revealOpenTab(true);
			measure();
		});
	});
</script>

<div class="strip" class:dock>
	<nav class="tabs" bind:this={scroller} onscroll={measure} aria-label={label}>
		<a href="/" class="tab" aria-current={isHome ? 'page' : undefined}>Front page</a>
		{#each categories as cat (cat.id)}
			<a
				href="/categories/{encodeURIComponent(cat.slug)}"
				class="tab"
				aria-current={openSlug === cat.slug ? 'page' : undefined}>{cat.name}</a
			>
		{/each}
	</nav>

	<!-- Extra ways to move along the strip with a mouse. Keyboard and screen reader users already
	     have every tab as a link, so the buttons stay out of their way. -->
	{#if canPrev}
		<button
			type="button"
			class="arrow arrow-prev"
			tabindex="-1"
			aria-hidden="true"
			onclick={() => nudge(-1)}
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 14 14"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
			>
				<polyline points="9,2 4,7 9,12" />
			</svg>
		</button>
	{/if}
	{#if canNext}
		<button
			type="button"
			class="arrow arrow-next"
			tabindex="-1"
			aria-hidden="true"
			onclick={() => nudge(1)}
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 14 14"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
			>
				<polyline points="5,2 10,7 5,12" />
			</svg>
		</button>
	{/if}
</div>

<style>
	.strip {
		position: relative;
		min-width: 0;
	}

	.strip.dock {
		flex: 1;
	}

	/* ── Tab strip ──
	   The line under the strip is a background so the open tab can cover it
	   even while the strip scrolls sideways. */
	.tabs {
		position: relative;
		display: flex;
		align-items: flex-end;
		overflow-x: auto;
		scrollbar-width: none;
		background: linear-gradient(var(--border), var(--border)) bottom / 100% 1px no-repeat;
	}

	.tabs::-webkit-scrollbar {
		display: none;
	}

	.dock .tabs {
		/* The line under the tabs is the dock's own border, so the strip draws none */
		background: none;
	}

	.tab {
		flex: none;
		display: flex;
		align-items: center;
		min-height: 44px;
		padding: 0 15px;
		border: 1px solid transparent;
		border-radius: 10px 10px 0 0;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1;
		color: var(--ink-60);
		text-decoration: none;
		white-space: nowrap;
		transition: color 120ms ease;
	}

	.tab:hover {
		color: var(--ink);
	}

	.tab:focus-visible {
		outline-offset: -4px;
	}

	.tab[aria-current='page'] {
		gap: 8px;
		padding: 0 18px;
		background: var(--cream);
		border-color: var(--border);
		border-bottom-color: var(--cream);
		font-weight: 600;
		color: var(--ink);
		animation: tab-open 160ms ease-out;
	}

	.tab[aria-current='page']::before {
		content: '';
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--accent);
	}

	/* A tab sitting on the dock's edge joins the page beneath, as in the masthead */
	.dock .tab[aria-current='page'] {
		margin-bottom: -1px;
		padding-bottom: 1px;
	}

	@keyframes tab-open {
		from {
			background-color: transparent;
		}
	}

	/* ── Arrows ──
	   They float over the ends of the strip, fading the tabs out underneath, so they take
	   no room of their own. They stop short of the line along the bottom. */
	.arrow {
		position: absolute;
		bottom: 1px;
		display: flex;
		align-items: center;
		width: 48px;
		height: 43px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ink);
		cursor: pointer;
		transition: color 120ms ease;
	}

	.arrow:hover {
		color: var(--accent);
	}

	.arrow-prev {
		left: 0;
		justify-content: flex-start;
		padding-left: 12px;
		background: linear-gradient(to right, var(--paper2) 35%, transparent);
	}

	.arrow-next {
		right: 0;
		justify-content: flex-end;
		padding-right: 12px;
		background: linear-gradient(to left, var(--paper2) 35%, transparent);
	}

	/* ── Smaller screens ── */
	@media (max-width: 1023px) {
		.tab {
			padding: 0 13px;
		}

		.tab[aria-current='page'] {
			gap: 7px;
			padding: 0 16px;
		}

		.tab[aria-current='page']::before {
			width: 6px;
			height: 6px;
		}
	}

	@media (max-width: 639px) {
		.arrow {
			width: 44px;
		}

		.arrow-prev {
			padding-left: 8px;
		}

		.arrow-next {
			padding-right: 8px;
		}

		.tabs {
			padding-left: 12px;
		}

		.dock .tabs {
			padding-left: 0;
		}

		.tab {
			padding: 0 12px;
		}

		.tab[aria-current='page'] {
			padding: 0 14px;
		}
	}
</style>
