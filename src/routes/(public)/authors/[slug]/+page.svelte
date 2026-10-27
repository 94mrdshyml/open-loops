<script lang="ts">
	import PageHead from '$lib/components/blog/PageHead.svelte';
	import SectionHead from '$lib/components/blog/SectionHead.svelte';
	import StoryRow from '$lib/components/blog/StoryRow.svelte';
	import { avatarImage } from '$lib/utils/image-url';
	import { jsonLdScript } from '$lib/utils/seo';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const { author, posts, siteUrl } = $derived(data);

	const storyLabel = $derived(posts.length === 1 ? 'story' : 'stories');

	const personJsonLd = $derived(
		jsonLdScript({
			'@context': 'https://schema.org',
			'@type': 'Person',
			name: author.displayName,
			description: author.bio ?? undefined,
			url: data.seo.canonicalUrl,
			...(author.avatarUrl ? { image: author.avatarUrl } : {}),
			worksFor: { '@type': 'Organization', name: 'Open Tabs', url: siteUrl }
		})
	);

	function initials(name: string): string {
		const parts = name.trim().split(/\s+/);
		if (parts.length === 1) return parts[0][0].toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html personJsonLd}
</svelte:head>

<div class="page">
	<PageHead
		kicker={author.role ?? 'Author'}
		title={author.displayName}
		dek={author.bio}
		count="{posts.length} {storyLabel}"
	>
		{#snippet lead()}
			<div class="avatar">
				{#if author.avatarUrl}
					<img
						src={avatarImage(author.avatarUrl) ?? author.avatarUrl}
						alt={author.displayName}
						class="avatar-img"
						width="96"
						height="96"
					/>
				{:else}
					<span class="avatar-initials">{initials(author.displayName)}</span>
				{/if}
			</div>
		{/snippet}
	</PageHead>

	<section aria-label="Stories by {author.displayName}">
		<SectionHead label="Stories" flush />

		{#if posts.length === 0}
			<p class="empty-state">No articles published yet.</p>
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

	.avatar {
		width: 96px;
		height: 96px;
		border-radius: 50%;
		overflow: hidden;
		background: var(--paper2);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.avatar-initials {
		font-family: var(--serif);
		font-style: italic;
		font-size: 36px;
		line-height: 1;
		color: var(--ink);
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

		.avatar {
			width: 72px;
			height: 72px;
		}

		.avatar-initials {
			font-size: 28px;
		}
	}
</style>
