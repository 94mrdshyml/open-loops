<script lang="ts">
	import StoryCover from './StoryCover.svelte';
	import { formatDateCompact } from '$lib/utils/format-date';
	import type { PostListItem } from '$lib/types/index';

	interface Props {
		categoryName: string;
		posts: PostListItem[];
	}

	let { categoryName, posts }: Props = $props();

	const lead = $derived(posts[0]);
	const side = $derived(posts.slice(1));
</script>

<div class="cat-grid">
	{#if lead}
		<article class="lead">
			<StoryCover
				src={lead.coverImageUrl}
				href="/posts/{lead.slug}"
				{categoryName}
				preset="card"
				blank="md"
			/>
			<div class="lead-text">
				<div class="meta">
					{#if lead.publishedAt}<span>{formatDateCompact(lead.publishedAt)}</span>{/if}
					{#if lead.publishedAt && lead.readingTimeMinutes}<span aria-hidden="true">·</span>{/if}
					{#if lead.readingTimeMinutes}<span>{lead.readingTimeMinutes} min read</span>{/if}
				</div>
				<h3 class="lead-title"><a href="/posts/{lead.slug}">{lead.title}</a></h3>
				{#if lead.subtitle}
					<p class="dek">{lead.subtitle}</p>
				{/if}
			</div>
		</article>
	{/if}

	{#if side.length > 0}
		<div class="side-list">
			{#each side as post (post.slug)}
				<article class="side">
					{#if post.coverImageUrl}
						<div class="side-cover">
							<StoryCover src={post.coverImageUrl} href="/posts/{post.slug}" preset="thumb" />
						</div>
					{/if}
					<div class="meta">
						{#if post.publishedAt}<span class="date">{formatDateCompact(post.publishedAt)}</span
							>{/if}
						{#if post.publishedAt && post.readingTimeMinutes}<span class="sep" aria-hidden="true"
								>·</span
							>{/if}
						{#if post.readingTimeMinutes}<span>{post.readingTimeMinutes} min read</span>{/if}
					</div>
					<h3 class="side-title"><a href="/posts/{post.slug}">{post.title}</a></h3>
				</article>
			{/each}
		</div>
	{/if}
</div>

<style>
	.cat-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
		gap: 40px;
	}

	.lead,
	.lead-text {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.lead .meta {
		margin-top: 6px;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 14px;
		line-height: 1;
		color: var(--ink-60);
	}

	h3 {
		margin: 0;
		font-family: var(--serif);
		font-weight: 500;
		text-wrap: pretty;
	}

	h3 a {
		color: var(--ink);
		text-decoration: none;
	}

	h3 a:hover {
		color: var(--accent);
	}

	.lead-title {
		font-size: 30px;
		line-height: 1.12;
		letter-spacing: -0.015em;
	}

	.dek {
		margin: 0;
		font-family: var(--serif);
		font-size: 17px;
		line-height: 1.5;
		color: var(--ink-60);
		text-wrap: pretty;
	}

	.side-list {
		display: flex;
		flex-direction: column;
	}

	.side {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding-bottom: 24px;
		margin-bottom: 24px;
		border-bottom: 1px solid var(--border);
	}

	.side-cover {
		max-width: 220px;
	}

	.side-title {
		font-size: 23px;
		line-height: 1.18;
		letter-spacing: -0.01em;
	}

	/* Tablet: lead goes cover | text, side stories two-up without covers */
	@media (max-width: 1023px) {
		.cat-grid {
			display: block;
		}

		.lead {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: 24px;
			padding: 24px 0;
			border-bottom: 1px solid var(--border);
		}

		.lead-text {
			gap: 10px;
		}

		.lead .meta {
			margin-top: 0;
		}

		.lead-title {
			font-size: 26px;
			line-height: 1.13;
			letter-spacing: -0.012em;
		}

		.side-list {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: 24px;
			padding-top: 20px;
		}

		.side {
			gap: 8px;
			padding: 0;
			margin: 0;
			border: 0;
		}

		.side-cover {
			display: none;
		}

		.side-title {
			font-size: 21px;
			line-height: 1.2;
			letter-spacing: 0;
		}
	}

	/* Phone: lead stacks with meta last; side stories get a small thumbnail on the right */
	@media (max-width: 639px) {
		.lead {
			display: flex;
			gap: 12px;
			padding: 20px 0;
		}

		.lead-text {
			gap: 12px;
		}

		.lead .meta {
			order: 3;
			font-size: 13px;
		}

		.lead-title {
			font-size: 24px;
			line-height: 1.14;
			margin-top: 4px;
		}

		.side-list {
			display: flex;
			flex-direction: column;
			gap: 0;
			padding-top: 0;
		}

		.side {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas: 'title thumb' 'meta thumb';
			column-gap: 16px;
			row-gap: 8px;
			align-items: start;
			padding: 18px 0;
			border-bottom: 1px solid var(--border);
		}

		.side-title {
			grid-area: title;
			font-size: 20px;
		}

		.side .meta {
			grid-area: meta;
			font-size: 13px;
		}

		.side .date,
		.side .sep {
			display: none;
		}

		.side-cover {
			display: block;
			grid-area: thumb;
			width: 96px;
			margin-top: 4px;
		}
	}
</style>
