<script lang="ts">
	import { tick } from 'svelte';
	import SectionHead from '$lib/components/blog/SectionHead.svelte';
	import StoryRow from '$lib/components/blog/StoryRow.svelte';
	import type { PostListItem } from '$lib/types/index';
	import { SEARCH_BATCH } from '$lib/utils/search-text';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const query = $derived(data.query);
	const effectiveQuery = $derived(data.effectiveQuery);
	const correction = $derived(data.correction);

	// What the page loaded, plus whatever "Load more" has added since.
	let more = $state<PostListItem[]>([]);
	// null until "Load more" has answered; until then the page's own data decides (so the server
	// draws the button too)
	let moreLeft = $state<boolean | null>(null);
	const hasMore = $derived(moreLeft ?? data.hasMore);
	let loadState = $state<'idle' | 'loading' | 'error'>('idle');
	let announce = $state('');

	// A new search starts the list again.
	$effect.pre(() => {
		void data.results;
		more = [];
		moreLeft = null;
		loadState = 'idle';
		announce = '';
	});

	const results = $derived.by(() => {
		const seen = new Set(data.results.map((p) => p.slug));
		return [...data.results, ...more.filter((p) => !seen.has(p.slug))];
	});

	const resultLabel = $derived(data.total === 1 ? 'story' : 'stories');

	// Only used when JavaScript is off: the form asks for the page to be shown with one more batch.
	const nextShown = $derived(Math.ceil(results.length / SEARCH_BATCH) + 1);

	// The link to run the search exactly as typed, when the typo fix changed it
	const exactHref = $derived(
		correction ? `/search?q=${encodeURIComponent(correction.from)}&exact=1` : ''
	);

	async function loadMore(event: SubmitEvent) {
		event.preventDefault();
		if (loadState === 'loading') return;
		loadState = 'loading';
		try {
			const res = await fetch(
				`/api/search?q=${encodeURIComponent(effectiveQuery)}&offset=${results.length}`
			);
			if (!res.ok) throw new Error(String(res.status));
			const body = (await res.json()) as { posts: PostListItem[]; hasMore: boolean };
			const have = new Set(results.map((p) => p.slug));
			const fresh = body.posts.filter((p) => !have.has(p.slug));
			more = [...more, ...fresh];
			moreLeft = body.hasMore;
			loadState = 'idle';
			announce = `${fresh.length} more ${fresh.length === 1 ? 'story' : 'stories'} loaded`;
			// Keyboard and screen reader users land on the first new story, not on a vanished button.
			await tick();
			if (fresh[0]) {
				document
					.querySelector<HTMLElement>(`[data-search-slug="${CSS.escape(fresh[0].slug)}"] h3 a`)
					?.focus();
			}
		} catch {
			loadState = 'error';
		}
	}
</script>

<div class="page">
	<!-- Search header -->
	<header class="search-header">
		<h1 class="search-title">Search</h1>
		<form method="GET" action="/search" class="search-form" role="search">
			<input
				type="search"
				name="q"
				value={query}
				placeholder="Search stories…"
				class="search-input"
				aria-label="Search articles"
				autocomplete="off"
				spellcheck="false"
			/>
			<button type="submit" class="search-submit" aria-label="Submit search">
				<svg
					width="22"
					height="22"
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					aria-hidden="true"
				>
					<circle cx="9" cy="9" r="6" /><line x1="14" y1="14" x2="19" y2="19" />
				</svg>
			</button>
		</form>
	</header>

	<!-- Results area -->
	{#if !query}
		<div class="state-block">
			<p class="state-heading">What are you looking for?</p>
			<p class="state-sub">Search across all Open Tabs stories.</p>
		</div>
	{:else if data.limited}
		<div class="state-block">
			<p class="state-heading">Too many searches</p>
			<p class="state-sub">Please wait a minute and try again.</p>
		</div>
	{:else if query.length < 2}
		<div class="state-block">
			<p class="state-heading">Type a little more</p>
			<p class="state-sub">Search needs at least two letters.</p>
		</div>
	{:else if data.empty}
		<div class="state-block">
			<p class="state-heading">No stories found for “{query}”</p>
			<p class="state-sub">
				Try a different keyword, or browse <a href="/categories">all topics</a>.
			</p>
		</div>
	{:else}
		<section aria-label="Search results">
			{#if correction}
				<p class="notice">
					Showing results for <strong>{correction.to}</strong>. Search instead for
					<a href={exactHref}>{correction.from}</a>
				</p>
			{/if}
			<SectionHead label="{data.total} {resultLabel} for “{effectiveQuery}”" flush />
			{#each results as post (post.slug)}
				<div data-search-slug={post.slug}>
					<StoryRow {post} />
				</div>
			{/each}

			{#if hasMore}
				<!-- A real form, so it still works without JavaScript (then it reloads with more stories) -->
				<form class="more" method="GET" action="/search" onsubmit={loadMore}>
					<input type="hidden" name="q" value={query} />
					<input type="hidden" name="shown" value={nextShown} />
					{#if loadState === 'error'}
						<p class="more-error" role="alert">Couldn’t load more stories. Please try again.</p>
					{/if}
					<button type="submit" class="more-btn" disabled={loadState === 'loading'}>
						{loadState === 'loading' ? 'Loading…' : 'Load more stories'}
					</button>
				</form>
			{/if}
			<p class="sr-only" role="status">{announce}</p>
		</section>
	{/if}
</div>

<style>
	.page {
		width: min(var(--max-w), 100% - 80px);
		margin: 0 auto;
	}

	.search-header {
		padding: 64px 0 48px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.search-title {
		margin: 0;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		line-height: 1;
		color: var(--accent);
	}

	.search-form {
		display: flex;
		align-items: center;
		gap: 8px;
		border-bottom: 2px solid var(--ink);
	}

	.search-input {
		flex: 1;
		min-width: 0;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 44px;
		line-height: 1.15;
		letter-spacing: -0.02em;
		color: var(--ink);
		background: transparent;
		border: none;
		padding: 8px 0 12px;
	}

	.search-input::placeholder {
		color: var(--ink-60);
		opacity: 0.7;
	}

	.search-input:focus {
		outline: none;
	}

	.search-form:focus-within {
		border-bottom-color: var(--accent);
	}

	.search-submit {
		flex-shrink: 0;
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

	.search-submit:hover {
		background: var(--ink-10);
	}

	.search-submit:active {
		background: var(--border);
	}

	.state-block {
		padding: 24px 0 40px;
	}

	.state-heading {
		font-family: var(--serif);
		font-weight: 500;
		font-size: 30px;
		line-height: 1.15;
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 0 0 10px;
	}

	.state-sub {
		font-family: var(--serif);
		font-style: italic;
		font-size: 19px;
		color: var(--ink-60);
		margin: 0;
	}

	.state-sub a {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 4px;
	}

	.state-sub a:hover {
		color: var(--accent);
	}

	.notice {
		margin: 0 0 24px;
		font-family: var(--serif);
		font-size: 19px;
		line-height: 1.4;
		color: var(--ink-60);
	}

	.notice strong {
		color: var(--ink);
		font-weight: 600;
	}

	.notice a {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 4px;
	}

	.notice a:hover {
		color: var(--accent);
	}

	.more {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 36px 0 48px;
	}

	.more-btn {
		min-height: 48px;
		padding: 0 32px;
		background: transparent;
		color: var(--ink);
		border: 1px solid var(--ink);
		border-radius: 2px;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 13px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			transform 0.15s ease;
	}

	.more-btn:hover:not(:disabled) {
		background: var(--ink);
		color: var(--cream);
	}

	.more-btn:active:not(:disabled) {
		transform: translateY(1px);
	}

	.more-btn:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	.more-error {
		margin: 0;
		font-family: var(--ui);
		font-size: 15px;
		color: var(--accent-ink);
	}

	@media (max-width: 1023px) {
		.search-header {
			padding: 48px 0 40px;
		}

		.search-input {
			font-size: 36px;
		}
	}

	@media (max-width: 639px) {
		.page {
			width: calc(100% - 40px);
		}

		.search-header {
			padding: 32px 0 32px;
			gap: 14px;
		}

		.search-input {
			font-size: 28px;
		}

		.state-heading {
			font-size: 24px;
		}

		.state-sub {
			font-size: 17px;
		}

		.notice {
			font-size: 17px;
		}
	}
</style>
