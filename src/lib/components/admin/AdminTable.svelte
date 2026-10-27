<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		columns: string[];
		children: Snippet;
	}

	let { columns, children }: Props = $props();
</script>

<div class="table-wrap">
	<table>
		<thead>
			<tr>
				{#each columns as col (col)}
					<th>{col}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{@render children()}
		</tbody>
	</table>
</div>

<style>
	.table-wrap {
		overflow-x: auto;
		border-top: 2px solid var(--color-admin-text);
		border-bottom: 1px solid var(--color-admin-border);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-admin-text-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-caps);
		border-bottom: 1px solid var(--color-admin-border);
		white-space: nowrap;
	}

	:global(.table-wrap tbody tr) {
		border-bottom: 1px solid var(--color-admin-border);
		transition: background-color 0.1s;
	}

	:global(.table-wrap tbody tr:last-child) {
		border-bottom: none;
	}

	:global(.table-wrap tbody tr:hover) {
		background: var(--color-admin-surface-hover);
	}

	:global(.table-wrap tbody td) {
		padding: 0.875rem 1rem;
		color: var(--color-admin-text);
		vertical-align: middle;
	}
</style>
