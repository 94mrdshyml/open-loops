<script lang="ts">
	import StoryCover from './StoryCover.svelte';
	import type { PostListItem } from '$lib/types/index';

	interface Props {
		post: PostListItem;
	}

	let { post }: Props = $props();
</script>

<article class="row" class:no-cover={!post.coverImageUrl}>
	<div class="meta">
		{#if post.category}
			<a class="kicker" href="/categories/{encodeURIComponent(post.category.slug)}"
				>{post.category.name}</a
			>
		{/if}
		{#if post.category && post.readingTimeMinutes}<span class="sep" aria-hidden="true">·</span>{/if}
		{#if post.readingTimeMinutes}<span>{post.readingTimeMinutes} min read</span>{/if}
	</div>
	<div class="text">
		<h3 class="title"><a href="/posts/{post.slug}">{post.title}</a></h3>
		{#if post.subtitle}
			<p class="dek">{post.subtitle}</p>
		{/if}
	</div>
	<div class="cover">
		<StoryCover
			src={post.coverImageUrl}
			href="/posts/{post.slug}"
			categoryName={post.category?.name}
			preset="card"
			blank="sm"
		/>
	</div>
</article>

<style>
	.row {
		display: grid;
		grid-template-columns: 140px minmax(0, 1fr) 208px;
		gap: 32px;
		padding: 28px 0;
		border-bottom: 1px solid var(--border);
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 14px;
		line-height: 1.3;
		color: var(--ink-60);
	}

	.sep {
		display: none;
	}

	.kicker {
		width: fit-content;
		color: var(--accent);
		font-weight: 600;
		text-decoration: none;
	}

	.kicker:hover {
		color: var(--ink);
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.title {
		margin: 0;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 26px;
		line-height: 1.15;
		letter-spacing: -0.012em;
		text-wrap: pretty;
	}

	.title a {
		color: var(--ink);
		text-decoration: none;
	}

	.title a:hover {
		color: var(--accent);
	}

	.dek {
		margin: 0;
		font-family: var(--serif);
		font-size: 17px;
		line-height: 1.5;
		color: var(--ink-60);
		text-wrap: pretty;
	}

	@media (max-width: 1023px) {
		.row {
			grid-template-columns: minmax(0, 1fr) 176px;
			grid-template-areas: 'meta cover' 'text cover';
			column-gap: 28px;
			row-gap: 10px;
			padding: 26px 0;
		}

		.meta {
			grid-area: meta;
			flex-direction: row;
			flex-wrap: wrap;
			gap: 8px;
			line-height: 1;
		}

		.sep {
			display: inline;
		}

		.text {
			grid-area: text;
		}

		.cover {
			grid-area: cover;
		}

		.title {
			font-size: 25px;
			letter-spacing: -0.01em;
		}
	}

	@media (max-width: 639px) {
		.row {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas: 'meta meta' 'text cover';
			column-gap: 16px;
			padding: 20px 0;
		}

		.meta {
			font-size: 13px;
		}

		.title {
			font-size: 21px;
			line-height: 1.18;
			letter-spacing: 0;
		}

		.dek {
			display: none;
		}

		.cover {
			width: 96px;
			margin-top: 4px;
		}

		.no-cover .cover {
			display: none;
		}
	}
</style>
