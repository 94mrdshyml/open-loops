<script lang="ts">
	import PageHead from '$lib/components/blog/PageHead.svelte';
	import SectionHead from '$lib/components/blog/SectionHead.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const { categories } = $derived(data);

	const totalStories = $derived(categories.reduce((sum, cat) => sum + cat.postCount, 0));
</script>

<div class="page">
	<PageHead
		kicker="Index"
		title="Topics"
		dek="Every subject Open Tabs writes about, and how many stories each one holds."
		count={categories.length > 0 ? `${totalStories} stories` : null}
	/>

	<section aria-label="All topics">
		<SectionHead label="All topics" flush />

		{#if categories.length === 0}
			<p class="empty-state">No topics yet.</p>
		{:else}
			<ol class="index">
				{#each categories as cat, i (cat.id)}
					<li>
						<span class="num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
						<a href="/categories/{encodeURIComponent(cat.slug)}" class="name">
							{#if cat.color}<span class="mark" style="background: {cat.color}" aria-hidden="true"
								></span>{/if}{cat.name}
						</a>
						<span class="count">{cat.postCount} {cat.postCount === 1 ? 'story' : 'stories'}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</section>
</div>

<style>
	.page {
		width: min(var(--max-w), 100% - 80px);
		margin: 0 auto;
	}

	.empty-state {
		font-family: var(--serif);
		font-style: italic;
		font-size: 19px;
		color: var(--ink-60);
		padding: 40px 0;
		margin: 0;
	}

	.index {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr) auto;
		gap: 24px;
		align-items: baseline;
		padding: 22px 0;
		border-bottom: 1px solid var(--border);
	}

	.num {
		font-family: var(--serif);
		font-style: italic;
		font-weight: 300;
		font-size: 28px;
		line-height: 1;
		color: var(--ink-60);
	}

	.name {
		width: fit-content;
		display: inline-flex;
		align-items: center;
		gap: 12px;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 32px;
		line-height: 1.1;
		letter-spacing: -0.015em;
		color: var(--ink);
		text-decoration: none;
	}

	.name:hover {
		color: var(--accent);
	}

	.mark {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.count {
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		color: var(--ink-60);
		white-space: nowrap;
	}

	@media (max-width: 1023px) {
		li {
			grid-template-columns: 48px minmax(0, 1fr) auto;
			gap: 16px;
			padding: 20px 0;
		}

		.name {
			font-size: 28px;
		}
	}

	@media (max-width: 639px) {
		.page {
			width: calc(100% - 40px);
		}

		li {
			grid-template-columns: 36px minmax(0, 1fr);
			grid-template-areas: 'num name' 'num count';
			column-gap: 12px;
			row-gap: 6px;
			padding: 18px 0;
		}

		.num {
			grid-area: num;
			font-size: 24px;
		}

		.name {
			grid-area: name;
			font-size: 24px;
			gap: 10px;
		}

		.count {
			grid-area: count;
			font-size: 14px;
		}
	}
</style>
