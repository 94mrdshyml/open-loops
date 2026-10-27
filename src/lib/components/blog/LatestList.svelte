<script lang="ts">
	import type { PostListItem } from '$lib/types/index';

	interface Props {
		posts: Pick<PostListItem, 'slug' | 'title' | 'category'>[];
	}

	let { posts }: Props = $props();
</script>

<ul class="latest">
	{#each posts as post (post.slug)}
		<li>
			{#if post.category}
				<a class="kicker" href="/categories/{encodeURIComponent(post.category.slug)}"
					>{post.category.name}</a
				>
			{:else}
				<span></span>
			{/if}
			<a class="title" href="/posts/{post.slug}" data-latest-slug={post.slug}>{post.title}</a>
		</li>
	{/each}
</ul>

<style>
	.latest {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: grid;
		grid-template-columns: 150px minmax(0, 1fr);
		gap: 24px;
		align-items: baseline;
		padding: 18px 0;
		border-bottom: 1px solid var(--border);
	}

	.kicker {
		width: fit-content;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 14px;
		line-height: 1.3;
		color: var(--accent);
		text-decoration: none;
	}

	.kicker:hover {
		color: var(--ink);
	}

	.title {
		width: fit-content;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 21px;
		line-height: 1.25;
		color: var(--ink);
		text-decoration: none;
		text-wrap: pretty;
	}

	.title:hover {
		color: var(--accent);
	}

	@media (max-width: 1023px) {
		li {
			grid-template-columns: 120px minmax(0, 1fr);
			gap: 20px;
			padding: 16px 0;
		}

		.title {
			font-size: 20px;
		}
	}

	@media (max-width: 639px) {
		li {
			display: flex;
			flex-direction: column;
			gap: 6px;
			padding: 14px 0;
		}

		.kicker {
			font-size: 13px;
			line-height: 1.2;
		}

		.title {
			font-size: 19px;
		}
	}
</style>
