<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		currentPage: number;
		totalPages: number;
		baseUrl: string;
	}

	let { currentPage, totalPages, baseUrl }: Props = $props();

	function buildUrl(p: number): string {
		const entries = [...page.url.searchParams.entries()].filter(([k]) => k !== 'page');
		entries.push(['page', String(p)]);
		const qs = entries
			.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
			.join('&');
		return `${baseUrl}?${qs}`;
	}
</script>

{#if totalPages > 1}
	<div class="pagination">
		{#if currentPage > 1}
			<a href={buildUrl(currentPage - 1)} class="page-btn">← Previous</a>
		{:else}
			<span class="page-btn disabled">← Previous</span>
		{/if}

		<span class="page-info">Page {currentPage} of {totalPages}</span>

		{#if currentPage < totalPages}
			<a href={buildUrl(currentPage + 1)} class="page-btn">Next →</a>
		{:else}
			<span class="page-btn disabled">Next →</span>
		{/if}
	</div>
{/if}

<style>
	.pagination {
		display: flex;
		align-items: center;
		gap: 1rem;
		justify-content: space-between;
		padding: 1rem 0;
	}

	.page-btn {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 1rem;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
		background: transparent;
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 10px;
		text-decoration: none;
		transition: background-color 0.15s;
	}

	a.page-btn:hover {
		background: var(--color-admin-surface-hover);
	}

	.page-btn.disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.page-info {
		font-size: var(--text-sm);
		color: var(--color-admin-text-muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
</style>
