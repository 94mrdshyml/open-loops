<script lang="ts">
	interface CategoryItem {
		name: string;
		slug: string;
		postCount: number;
	}

	interface Props {
		categories: CategoryItem[];
		activeSlug: string | null;
		allHref?: string;
		getCategoryHref?: (slug: string) => string;
	}

	let {
		categories,
		activeSlug,
		allHref = '/',
		getCategoryHref = (slug) => `/?category=${slug}`
	}: Props = $props();
</script>

<nav class="filter-bar" aria-label="Filter by category">
	<a
		href={allHref}
		class="filter-btn"
		class:active={!activeSlug}
		aria-current={!activeSlug ? 'page' : undefined}
	>
		All
	</a>

	{#each categories as cat (cat.slug)}
		<a
			href={getCategoryHref(cat.slug)}
			class="filter-btn"
			class:active={activeSlug === cat.slug}
			aria-current={activeSlug === cat.slug ? 'page' : undefined}
		>
			{cat.name}
		</a>
	{/each}
</nav>

<style>
	.filter-bar {
		display: flex;
		gap: 0.375rem;
		overflow-x: auto;
		scrollbar-width: none;
		padding-bottom: 2px;
	}

	.filter-bar::-webkit-scrollbar {
		display: none;
	}

	.filter-btn {
		display: inline-block;
		flex-shrink: 0;
		padding: 0.375rem 0.875rem;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-ink-muted);
		background-color: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		text-decoration: none;
		transition:
			color 0.15s,
			background-color 0.15s,
			border-color 0.15s;
		white-space: nowrap;
	}

	.filter-btn:hover {
		color: var(--color-ink);
		border-color: var(--color-border-strong);
	}

	.filter-btn.active {
		color: var(--color-surface);
		background-color: var(--color-ink);
		border-color: var(--color-ink);
	}
</style>
