<script lang="ts">
	import PageHead from '$lib/components/blog/PageHead.svelte';
	import SectionHead from '$lib/components/blog/SectionHead.svelte';
	import StoryRow from '$lib/components/blog/StoryRow.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const { category, posts, totalCount, page, totalPages } = $derived(data);

	const storyLabel = $derived(totalCount === 1 ? 'story' : 'stories');
</script>

<div class="page">
	<PageHead
		kicker="Topic"
		title={category.name}
		dek={category.description}
		count="{totalCount} {storyLabel}"
		markColor={category.color}
	/>

	<section aria-label="Stories in {category.name}">
		<SectionHead label={page > 1 ? `Page ${page}` : 'All stories'} flush />

		{#if posts.length === 0}
			<p class="empty-state">No stories in this category yet.</p>
		{:else}
			{#each posts as post (post.slug)}
				<StoryRow {post} />
			{/each}

			<!-- Pagination -->
			{#if totalPages > 1}
				<nav class="pagination" aria-label="Page navigation">
					{#if page > 1}
						<a href="?page={page - 1}" class="page-btn" rel="prev">← Previous</a>
					{:else}
						<span class="page-btn page-btn-disabled" aria-disabled="true">← Previous</span>
					{/if}

					<span class="page-indicator">Page {page} of {totalPages}</span>

					{#if page < totalPages}
						<a href="?page={page + 1}" class="page-btn" rel="next">Next →</a>
					{:else}
						<span class="page-btn page-btn-disabled" aria-disabled="true">Next →</span>
					{/if}
				</nav>
			{/if}
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

	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-top: 40px;
	}

	.page-btn {
		display: flex;
		align-items: center;
		min-height: 44px;
		padding: 0 18px;
		font-family: var(--ui);
		font-size: 15px;
		font-weight: 600;
		color: var(--ink);
		text-decoration: none;
		border: 1px solid var(--border);
		border-radius: 10px;
		transition: background-color 120ms ease;
	}

	a.page-btn:hover {
		background: var(--ink-10);
	}

	a.page-btn:active {
		background: var(--border);
	}

	.page-btn-disabled {
		color: var(--ink-60);
		opacity: 0.6;
	}

	.page-indicator {
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		color: var(--ink-60);
	}

	@media (max-width: 639px) {
		.page {
			width: calc(100% - 40px);
		}

		.pagination {
			margin-top: 32px;
		}

		.page-btn {
			padding: 0 14px;
			font-size: 14px;
		}

		.page-indicator {
			font-size: 14px;
		}
	}
</style>
