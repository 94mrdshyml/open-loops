<script lang="ts">
	import LogoMark from './LogoMark.svelte';
	import type { CategoryWithCount } from '$lib/types/index';

	interface NavAuthor {
		id: string;
		slug: string;
		displayName: string;
	}

	interface Props {
		navCategories?: CategoryWithCount[];
		navAuthors?: NavAuthor[];
	}

	let { navCategories = [], navAuthors = [] }: Props = $props();

	const year = new Date().getFullYear();
</script>

<footer>
	<div class="inner">
		<div class="grid">
			<!-- Brand -->
			<div class="brand-col">
				<LogoMark href="/" size="sm" byline={false} />
				<p class="about">
					Explainer writing on business, politics, and geopolitics, through a money lens.
				</p>
			</div>

			<!-- Topics -->
			<nav class="col" aria-label="Topics">
				<h2 class="col-head">Topics</h2>
				<div class="col-links">
					{#each navCategories as cat (cat.id)}
						<a href="/categories/{encodeURIComponent(cat.slug)}" class="footer-link">{cat.name}</a>
					{/each}
				</div>
			</nav>

			<!-- Pages and authors -->
			<nav class="col" aria-label="Pages">
				<h2 class="col-head">Pages</h2>
				<div class="col-links">
					<a href="/" class="footer-link">Home</a>
					<a href="/categories" class="footer-link">Categories</a>
					<a href="/tags" class="footer-link">Tags</a>
					<a href="/search" class="footer-link">Search</a>
					<a href="/about" class="footer-link">About</a>
					<a href="/newsletter" class="footer-link">Newsletter</a>
				</div>
				{#if navAuthors.length > 0}
					<h2 class="col-head col-head-gap">Authors</h2>
					<div class="col-links">
						{#each navAuthors as author (author.id)}
							<a href="/authors/{encodeURIComponent(author.slug)}" class="footer-link"
								>{author.displayName}</a
							>
						{/each}
					</div>
				{/if}
			</nav>
		</div>

		<p class="copyright">© {year} Anurag Singh Jakhar · IndexDaily Media · Delhi</p>
	</div>
</footer>

<style>
	footer {
		border-top: 2px solid var(--ink);
		margin-top: 96px;
		background: var(--cream);
	}

	.inner {
		width: min(var(--max-w), 100% - 80px);
		margin: 0 auto;
		padding: 40px 0 48px;
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 0.9fr);
		gap: 48px;
	}

	.brand-col {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.about {
		font-family: var(--serif);
		font-style: italic;
		font-size: 18px;
		line-height: 1.45;
		color: var(--ink-60);
		margin: 0;
		max-width: 380px;
	}

	.col-head {
		font-family: var(--ui);
		font-weight: 600;
		font-size: 14px;
		line-height: 1;
		color: var(--ink-60);
		margin: 0 0 6px;
	}

	.col-head-gap {
		margin-top: 20px;
	}

	.col-links {
		display: flex;
		flex-direction: column;
	}

	.footer-link {
		display: flex;
		align-items: center;
		align-self: flex-start;
		min-height: 36px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		color: var(--ink);
		text-decoration: none;
	}

	.footer-link:hover {
		color: var(--accent);
	}

	.copyright {
		font-family: var(--ui);
		font-size: 14px;
		line-height: 1.4;
		color: var(--ink-60);
		margin: 32px 0 0;
		padding-top: 20px;
		border-top: 1px solid var(--border);
	}

	@media (max-width: 1023px) {
		.grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: 32px 40px;
		}

		.brand-col {
			grid-column: span 2;
		}
	}

	@media (max-width: 639px) {
		footer {
			margin-top: 56px;
		}

		.inner {
			width: calc(100% - 40px);
			padding: 28px 0 36px;
		}

		.about {
			font-size: 17px;
		}

		.footer-link {
			min-height: 44px;
		}

		.copyright {
			font-size: 13px;
		}
	}
</style>
