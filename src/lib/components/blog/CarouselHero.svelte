<script lang="ts">
	import { onMount } from 'svelte';
	import StoryCover from './StoryCover.svelte';
	import { formatDateCompact } from '$lib/utils/format-date';
	import type { PostListItem } from '$lib/types/index';

	interface Props {
		posts: PostListItem[];
	}

	let { posts }: Props = $props();

	/** How long each featured story stays before the next one slides in. */
	const AUTOPLAY_MS = 5000;

	let current = $state(0);
	let track = $state<HTMLDivElement | null>(null);
	let tabEls = $state<HTMLButtonElement[]>([]);
	const n = $derived(posts.length);

	function reducedMotion(): boolean {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	// Changing story is a soft crossfade: the story fades out, the next one is put in place while
	// nothing is visible, and it fades back in. Nothing slides across the screen. (Swiping with a
	// finger still scrolls, because the finger is doing the moving.)
	let fading = $state(false);
	let fadeToken = 0;
	const FADE_OUT_MS = 220;

	async function go(i: number, focusTab = false) {
		if (!track) return;
		const next = (i + n) % n;
		const token = ++fadeToken;
		current = next;
		if (focusTab) tabEls[next]?.focus();

		if (reducedMotion()) {
			track.scrollTo({ left: next * track.clientWidth, behavior: 'auto' });
			return;
		}

		fading = true;
		await new Promise((resolve) => setTimeout(resolve, FADE_OUT_MS));
		// A newer choice has taken over while this one was fading out
		if (token !== fadeToken || !track) return;
		track.scrollTo({ left: next * track.clientWidth, behavior: 'auto' });
		fading = false;
	}

	// With many featured stories the tab row scrolls; keep the open tab in view
	$effect(() => {
		const tab = tabEls[current];
		const row = tab?.parentElement;
		if (!tab || !row || row.scrollWidth <= row.clientWidth) return;
		row.scrollTo({
			left: tab.offsetLeft - 8,
			behavior: reducedMotion() ? 'auto' : 'smooth'
		});
	});

	// Swiping or scrolling the track moves the open tab too
	let ticking = false;
	function onScroll() {
		if (ticking || !track) return;
		ticking = true;
		requestAnimationFrame(() => {
			ticking = false;
			if (!track) return;
			const i = Math.round(track.scrollLeft / track.clientWidth);
			if (i >= 0 && i < n) current = i;
		});
	}

	function onTabKey(e: KeyboardEvent) {
		const keys: Record<string, number> = {
			ArrowRight: current + 1,
			ArrowLeft: current - 1,
			Home: 0,
			End: n - 1
		};
		if (e.key in keys) {
			e.preventDefault();
			go(keys[e.key], true);
		}
	}

	// Stay on the same story when the window changes size
	function onResize() {
		if (track) track.scrollLeft = current * track.clientWidth;
	}

	// Automatic rotation. It waits while keyboard focus is inside the carousel, while the tab is in the background or the carousel is off screen, and the
	// reader can switch it off. People who ask their device for less motion start with it off.
	let wantsAutoplay = $state(false);
	let pageHidden = $state(false);
	let onScreen = $state(true);
	let sectionEl = $state<HTMLElement | null>(null);

	const playing = $derived(wantsAutoplay && n > 1 && !pageHidden && onScreen);

	onMount(() => {
		wantsAutoplay = !reducedMotion();
		pageHidden = document.visibilityState === 'hidden';

		if (!sectionEl) return;
		const watcher = new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting), {
			threshold: 0.3
		});
		watcher.observe(sectionEl);
		return () => watcher.disconnect();
	});

	// The thin line along the open tab fills over five seconds, and when it is full the next story
	// comes in (see onanimationend below). The line stops where it is while keyboard focus is
	// inside the carousel, and starts again from empty when the story changes, the reader presses
	// Start, or the tab or carousel comes back into view.
	function nextStory() {
		go(current + 1);
	}

	const pad = (k: number) => String(k + 1).padStart(2, '0');
	const posLabel = $derived(`${current + 1} of ${n}`);
</script>

<svelte:window onresize={onResize} />
<svelte:document onvisibilitychange={() => (pageHidden = document.visibilityState === 'hidden')} />

{#if n > 0}
	<section
		class="feat"
		aria-roledescription="carousel"
		aria-label="Featured stories"
		bind:this={sectionEl}
	>
		{#if n > 1}
			<div class="feat-bar">
				<div class="feat-tabs" role="tablist" aria-label="Choose a featured story">
					{#each posts as post, i (post.slug)}
						<button
							bind:this={tabEls[i]}
							type="button"
							role="tab"
							class="feat-tab"
							id="feat-tab-{i}"
							aria-controls="feat-slide-{i}"
							aria-selected={i === current}
							tabindex={i === current ? 0 : -1}
							onclick={() => go(i)}
							onkeydown={onTabKey}
						>
							<span class="feat-num">{pad(i)}</span>
							<span class="feat-label">{post.category?.name ?? 'Story'}</span>
							{#if i === current}
								<span class="feat-line" aria-hidden="true">
									{#if playing}
										{#key current}
											<span
												class="feat-fill"
												style="--fill-ms: {AUTOPLAY_MS}ms"
												onanimationend={nextStory}
											></span>
										{/key}
									{/if}
								</span>
							{/if}
						</button>
					{/each}
				</div>
				<div class="feat-controls">
					<span class="feat-pos" aria-live={wantsAutoplay ? 'off' : 'polite'}>{posLabel}</span>
					{@render arrows()}
				</div>
			</div>
		{/if}

		<div class="feat-track" class:is-fading={fading} bind:this={track} onscroll={onScroll}>
			{#each posts as post, i (post.slug)}
				<div
					class="feat-slide"
					id="feat-slide-{i}"
					role={n > 1 ? 'tabpanel' : undefined}
					aria-labelledby={n > 1 ? `feat-tab-${i}` : undefined}
					aria-hidden={i !== current}
					inert={i !== current}
				>
					<div class="feat-cover">
						<StoryCover
							src={post.coverImageUrl}
							href="/posts/{post.slug}"
							categoryName={post.category?.name}
							preset="hero"
							og
							blank="lg"
							eager={i === 0}
						/>
					</div>
					<article class="feat-text">
						<div class="meta">
							{#if post.category}
								<a class="kicker" href="/categories/{encodeURIComponent(post.category.slug)}"
									>{post.category.name}</a
								>
							{/if}
							{#if post.category && post.readingTimeMinutes}<span aria-hidden="true">·</span>{/if}
							{#if post.readingTimeMinutes}<span>{post.readingTimeMinutes} min read</span>{/if}
						</div>
						<h2 class="feat-title"><a href="/posts/{post.slug}">{post.title}</a></h2>
						{#if post.subtitle}
							<p class="feat-dek">{post.subtitle}</p>
						{/if}
						<div class="feat-by">
							{[post.author?.name, formatDateCompact(post.publishedAt, true)]
								.filter(Boolean)
								.join(' · ')}
						</div>
					</article>
				</div>
			{/each}
		</div>

		{#if n > 1}
			<div class="feat-foot">
				<span class="feat-foot-info"
					>{formatDateCompact(posts[current]?.publishedAt ?? null, true)} · {posLabel}</span
				>
				<div class="feat-controls">{@render arrows()}</div>
			</div>
		{/if}
	</section>
{/if}

{#snippet arrows()}
	<button
		type="button"
		class="arrow"
		onclick={() => (wantsAutoplay = !wantsAutoplay)}
		aria-label={wantsAutoplay ? 'Pause automatic rotation' : 'Start automatic rotation'}
	>
		{#if wantsAutoplay}
			<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
				<path d="M6 4v10M12 4v10" fill="none" stroke="currentColor" stroke-width="1.8" />
			</svg>
		{:else}
			<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
				<path d="M6 3.8v10.4L14.2 9z" fill="currentColor" />
			</svg>
		{/if}
	</button>
	<button type="button" class="arrow" onclick={() => go(current - 1)} aria-label="Previous story">
		<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
			<path d="M11 3.5 5.5 9l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.6" />
		</svg>
	</button>
	<button type="button" class="arrow" onclick={() => go(current + 1)} aria-label="Next story">
		<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
			<path d="M7 3.5 12.5 9 7 14.5" fill="none" stroke="currentColor" stroke-width="1.6" />
		</svg>
	</button>
{/snippet}

<style>
	/* Cover runs to 1100px with 24px gutters; text sits in the 896px column. */
	.feat-bar,
	.feat-cover {
		width: min(1100px, 100% - 48px);
		margin-inline: auto;
	}

	.feat-text,
	.feat-foot {
		width: min(var(--max-w), 100% - 80px);
		margin-inline: auto;
	}

	.feat-bar {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}

	.feat-tabs {
		position: relative;
		display: flex;
		align-items: flex-end;
		flex: 1;
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.feat-tabs::-webkit-scrollbar {
		display: none;
	}

	.feat-tab {
		position: relative;
		flex: none;
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 48px;
		padding: 0 18px;
		background: transparent;
		border: 0;
		border-radius: 10px 10px 0 0;
		color: var(--ink-60);
		cursor: pointer;
		transition: color 120ms ease;
	}

	.feat-tab:hover {
		color: var(--ink);
	}

	.feat-tab:focus-visible {
		outline-offset: -4px;
	}

	.feat-num {
		font-family: var(--serif);
		font-style: italic;
		font-size: 20px;
		line-height: 1;
	}

	.feat-label {
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1;
	}

	/* The open story's tab joins the cover below it */
	.feat-tab[aria-selected='true'] {
		padding: 0 20px;
		background: var(--paper2);
		color: var(--ink);
	}

	.feat-tab[aria-selected='true'] .feat-num {
		color: var(--accent);
	}

	.feat-tab[aria-selected='true'] .feat-label {
		font-weight: 600;
	}

	/* The line along the open tab: a faint track, with the accent filling it over five seconds */
	.feat-line {
		position: absolute;
		inset: auto 20px 0 20px;
		height: 2px;
		background: var(--border);
		border-radius: 1px;
		overflow: hidden;
	}

	.feat-fill {
		display: block;
		width: 100%;
		height: 100%;
		background: var(--accent);
		transform-origin: left;
		transform: scaleX(0);
		animation: feat-fill var(--fill-ms) linear forwards;
	}

	@keyframes feat-fill {
		to {
			transform: scaleX(1);
		}
	}

	/* Hold the line (and so the carousel) while keyboard focus is inside it. The pointer being over
	   it does not count: the carousel fills most of the screen, so the pointer is nearly always
	   over it and the stories would never move. */
	.feat:has(:focus-visible) .feat-fill {
		animation-play-state: paused;
	}

	.feat-controls {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 0 4px 16px;
	}

	.feat-pos {
		font-family: var(--ui);
		font-weight: 500;
		font-size: 14px;
		color: var(--ink-60);
		margin-right: 8px;
	}

	.arrow {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		transition: background-color 120ms ease;
	}

	.arrow:hover {
		background: var(--ink-10);
	}

	.arrow:active {
		background: var(--border);
	}

	.feat-track {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		/* Fading back in is a little slower than fading out, so the change feels soft */
		transition: opacity 360ms ease;
	}

	.feat-track.is-fading {
		opacity: 0;
		transition-duration: 220ms;
	}

	.feat-track::-webkit-scrollbar {
		display: none;
	}

	.feat-slide {
		flex: 0 0 100%;
		scroll-snap-align: start;
		scroll-snap-stop: always;
	}

	.feat-cover {
		background: var(--paper2);
		border-radius: 0 10px 0 0;
		overflow: hidden;
	}

	.feat-cover :global(.blank-ear) {
		display: none;
	}

	.feat-text {
		padding-top: 28px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1;
		color: var(--ink-60);
	}

	.kicker {
		color: var(--accent);
		font-weight: 600;
		text-decoration: none;
	}

	.kicker:hover {
		color: var(--ink);
	}

	.feat-title {
		font-family: var(--serif);
		font-weight: 500;
		font-size: 56px;
		line-height: 1.03;
		letter-spacing: -0.025em;
		max-width: 860px;
		text-wrap: balance;
		margin: 0;
	}

	.feat-title a {
		color: inherit;
		text-decoration: none;
	}

	.feat-title a:hover {
		color: var(--accent);
	}

	.feat-dek {
		font-family: var(--serif);
		font-size: 21px;
		line-height: 1.45;
		color: var(--ink-60);
		max-width: var(--article-w);
		text-wrap: pretty;
		margin: 0;
	}

	.feat-by {
		font-family: var(--ui);
		font-weight: 500;
		font-size: 14px;
		line-height: 1;
		color: var(--ink-60);
	}

	.feat-foot {
		display: none;
	}

	@media (max-width: 1023px) {
		.feat-tab {
			gap: 8px;
			min-height: 44px;
			padding: 0 12px;
		}

		.feat-tab[aria-selected='true'] {
			padding: 0 16px;
		}

		.feat-num {
			font-size: 18px;
		}

		.feat-label {
			font-size: 14px;
		}

		.feat-tab:not([aria-selected='true']) .feat-label {
			display: none;
		}

		.feat-pos {
			display: none;
		}

		.feat-text {
			padding-top: 24px;
			gap: 14px;
		}

		.meta {
			font-size: 14px;
		}

		.feat-title {
			font-size: 44px;
			line-height: 1.05;
			letter-spacing: -0.022em;
		}

		.feat-dek {
			font-size: 19px;
		}

		.feat-by {
			display: none;
		}
	}

	@media (max-width: 639px) {
		.feat-bar,
		.feat-cover {
			width: 100%;
		}

		.feat-text,
		.feat-foot {
			width: calc(100% - 40px);
		}

		.feat-bar {
			display: block;
		}

		.feat-tabs {
			padding-left: 8px;
		}

		.feat-tab:not([aria-selected='true']) .feat-label {
			display: inline;
		}

		.feat-tab[aria-selected='true'] {
			padding: 0 14px;
		}

		.feat-bar .feat-controls {
			display: none;
		}

		.feat-cover {
			border-radius: 0;
		}

		.feat-text {
			padding-top: 20px;
			gap: 12px;
		}

		.meta {
			gap: 8px;
		}

		.feat-title {
			font-size: 34px;
			line-height: 1.07;
			letter-spacing: -0.02em;
			text-wrap: pretty;
		}

		.feat-dek {
			font-size: 18px;
			line-height: 1.5;
		}

		.feat-foot {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-top: 16px;
		}

		.feat-foot-info {
			font-family: var(--ui);
			font-weight: 500;
			font-size: 13px;
			color: var(--ink-60);
		}

		.feat-foot .feat-controls {
			padding: 0;
		}
	}
</style>
