<script lang="ts">
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import CarouselHero from '$lib/components/blog/CarouselHero.svelte';
	import SectionHead from '$lib/components/blog/SectionHead.svelte';
	import TrendingList from '$lib/components/blog/TrendingList.svelte';
	import CategorySection from '$lib/components/blog/CategorySection.svelte';
	import LatestList from '$lib/components/blog/LatestList.svelte';
	import NewsletterForm from '$lib/components/blog/NewsletterForm.svelte';
	import type { PostListItem } from '$lib/types/index';
	import type { PageData } from './$types';

	type LatestItem = Pick<PostListItem, 'slug' | 'title' | 'category'>;

	let { data }: { data: PageData } = $props();

	// The Latest list: what the page loaded, plus whatever "Load more" has added since.
	let more = $state<LatestItem[]>([]);
	// null until "Load more" has answered; until then the page's own data decides (so the server
	// draws the button too)
	let moreLeft = $state<boolean | null>(null);
	const hasMore = $derived(moreLeft ?? data.hasMoreLatest);
	let loadState = $state<'idle' | 'loading' | 'error'>('idle');
	let announce = $state('');

	// A new page of data (for example another category) starts the list again.
	$effect.pre(() => {
		void data.latestPosts;
		more = [];
		moreLeft = null;
		loadState = 'idle';
		announce = '';
	});

	const latest = $derived.by(() => {
		const seen = new Set(data.latestPosts.map((p) => p.slug));
		return [...data.latestPosts, ...more.filter((p) => !seen.has(p.slug))];
	});

	// Only used when JavaScript is off: the form asks for one more batch worth of stories.
	const nextLatestPage = $derived(
		Math.ceil(latest.length / Math.max(1, data.latestPosts.length || 1)) + 1
	);

	async function loadMore(event: SubmitEvent) {
		event.preventDefault();
		if (loadState === 'loading') return;
		loadState = 'loading';
		try {
			const category = data.categorySlug
				? `&category=${encodeURIComponent(data.categorySlug)}`
				: '';
			const res = await fetch(`/api/latest?offset=${latest.length}${category}`);
			if (!res.ok) throw new Error(String(res.status));
			const body = (await res.json()) as { posts: LatestItem[]; hasMore: boolean };
			const have = new Set(latest.map((p) => p.slug));
			const fresh = body.posts.filter((p) => !have.has(p.slug));
			more = [...more, ...fresh];
			moreLeft = body.hasMore;
			loadState = 'idle';
			announce = `${fresh.length} more ${fresh.length === 1 ? 'story' : 'stories'} loaded`;
			// Keyboard and screen reader users land on the first new story, not on a vanished button.
			await tick();
			if (fresh[0]) {
				document
					.querySelector<HTMLElement>(`[data-latest-slug="${CSS.escape(fresh[0].slug)}"]`)
					?.focus();
			}
		} catch {
			loadState = 'error';
		}
	}
</script>

<div class="page">
	<h1 class="visually-hidden">{data.siteName} — {data.siteTagline}</h1>

	<!-- Featured stories carousel -->
	{#if data.carouselPosts.length > 0}
		<CarouselHero posts={data.carouselPosts} />
	{/if}

	<div class="content">
		<!-- Trending -->
		{#if data.trendingPosts.length > 0}
			<section class="section" aria-label="Trending">
				<SectionHead label="Trending" flush />
				<TrendingList posts={data.trendingPosts} />
			</section>
		{/if}

		<!-- Category sections: lead story and two more -->
		{#each data.categoryDives as dive (dive.category.id)}
			{#if dive.posts.length > 0}
				<section class="section" aria-label={dive.category.name}>
					<SectionHead
						label={dive.category.name}
						href="/categories/{encodeURIComponent(dive.category.slug)}"
						actionLabel="More in {dive.category.name}"
					/>
					<CategorySection categoryName={dive.category.name} posts={dive.posts} />
				</section>
			{/if}
		{/each}

		<!-- Latest stories -->
		{#if data.latestPosts.length > 0}
			<section class="section" aria-label="Latest stories">
				<SectionHead label="Latest stories" flush />
				<LatestList posts={latest} />

				{#if hasMore}
					<!-- A real form, so it still works without JavaScript (then it reloads with more stories) -->
					<form class="more" method="GET" action="/" onsubmit={loadMore}>
						{#if data.categorySlug}
							<input type="hidden" name="category" value={data.categorySlug} />
						{/if}
						<input type="hidden" name="latest" value={nextLatestPage} />
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

		<NewsletterForm
			isSubscribed={page.data.isNewsletterSubscriber ?? false}
			user={page.data.user ?? null}
		/>
	</div>
</div>

<style>
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.page {
		min-height: 100dvh;
		padding-top: 44px;
	}

	.content {
		width: min(var(--max-w), 100% - 80px);
		margin: 0 auto;
	}

	.section {
		margin-top: 80px;
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
		.page {
			padding-top: 32px;
		}

		.section {
			margin-top: 64px;
		}
	}

	@media (max-width: 639px) {
		.page {
			padding-top: 24px;
		}

		.content {
			width: calc(100% - 40px);
		}

		.section {
			margin-top: 48px;
		}
	}
</style>
