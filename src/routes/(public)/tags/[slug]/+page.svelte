<script lang="ts">
	import PageHead from '$lib/components/blog/PageHead.svelte';
	import SectionHead from '$lib/components/blog/SectionHead.svelte';
	import StoryRow from '$lib/components/blog/StoryRow.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const { tag, posts } = $derived(data);
	const storyLabel = $derived(posts.length === 1 ? 'story' : 'stories');
</script>

<div class="page">
	<PageHead kicker="Tag" title="#{tag.name}" count="{posts.length} {storyLabel}" />

	<section aria-label="Stories tagged {tag.name}">
		<SectionHead label="Stories" flush />

		{#if posts.length === 0}
			<p class="empty-state">No articles tagged with this topic yet.</p>
		{:else}
			{#each posts as post (post.slug)}
				<StoryRow {post} />
			{/each}
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

	@media (max-width: 639px) {
		.page {
			width: calc(100% - 40px);
		}
	}
</style>
