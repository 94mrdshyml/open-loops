<script lang="ts">
	import type { PostListItem } from '$lib/types/index';

	interface Props {
		posts: PostListItem[];
	}

	let { posts }: Props = $props();
</script>

<ol class="trend">
	{#each posts as post, i (post.slug)}
		<li>
			<span class="num" aria-hidden="true">{i + 1}</span>
			<div class="body">
				<h3 class="title"><a href="/posts/{post.slug}">{post.title}</a></h3>
				<div class="meta">
					{#if post.category}
						<a class="kicker" href="/categories/{encodeURIComponent(post.category.slug)}"
							>{post.category.name}</a
						>
					{/if}
					{#if post.category && post.readingTimeMinutes}<span class="sep" aria-hidden="true">·</span
						>{/if}
					{#if post.readingTimeMinutes}<span>{post.readingTimeMinutes} min read</span>{/if}
				</div>
			</div>
		</li>
	{/each}
</ol>

<style>
	.trend {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr) 150px;
		gap: 24px;
		align-items: baseline;
		padding: 22px 0;
		border-bottom: 1px solid var(--border);
	}

	.num {
		font-family: var(--serif);
		font-style: italic;
		font-weight: 300;
		font-size: 40px;
		line-height: 1;
		color: var(--ink-60);
	}

	/* Desktop: title and meta take their own grid columns */
	.body {
		display: contents;
	}

	.title {
		font-family: var(--serif);
		font-weight: 500;
		font-size: 24px;
		line-height: 1.18;
		letter-spacing: -0.01em;
		text-wrap: pretty;
		margin: 0;
	}

	.title a {
		color: var(--ink);
		text-decoration: none;
	}

	.title a:hover {
		color: var(--accent);
	}

	.meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 6px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 14px;
		line-height: 1.2;
		color: var(--ink-60);
	}

	.sep {
		display: none;
	}

	.kicker {
		color: var(--accent);
		font-weight: 600;
		text-decoration: none;
	}

	.kicker:hover {
		color: var(--ink);
	}

	@media (max-width: 1023px) {
		li {
			grid-template-columns: 48px minmax(0, 1fr);
			gap: 16px;
			align-items: start;
			padding: 20px 0;
		}

		.num {
			font-size: 36px;
		}

		.body {
			display: flex;
			flex-direction: column;
			gap: 8px;
		}

		.title {
			font-size: 22px;
			line-height: 1.2;
			letter-spacing: 0;
		}

		.meta {
			flex-direction: row;
			align-items: center;
			gap: 8px;
			line-height: 1;
		}

		.sep {
			display: inline;
		}
	}

	@media (max-width: 639px) {
		li {
			grid-template-columns: 36px minmax(0, 1fr);
			gap: 12px;
			padding: 18px 0;
		}

		.num {
			font-size: 32px;
		}

		.title {
			font-size: 20px;
		}

		.meta {
			font-size: 13px;
		}
	}
</style>
