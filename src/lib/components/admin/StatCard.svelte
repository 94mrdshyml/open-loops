<script lang="ts">
	interface Props {
		label: string;
		value: number | string;
		sublabel?: string;
		accent?: boolean;
	}

	let { label, value, sublabel, accent = false }: Props = $props();
</script>

<div class="stat-card" class:accent>
	<div class="stat-value">{value}</div>
	<div class="stat-label">{label}</div>
	{#if sublabel}
		<div class="stat-sublabel">{sublabel}</div>
	{/if}
</div>

<style>
	.stat-card {
		border-top: 2px solid var(--color-admin-text);
		padding: 0.875rem 0 0.25rem;
	}

	.stat-card.accent {
		border-top-color: var(--color-admin-accent);
	}

	.stat-value {
		font-family: var(--serif);
		font-size: 2.5rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		color: var(--color-admin-text);
		line-height: 1;
		margin-bottom: 0.5rem;
		font-variant-numeric: tabular-nums;
	}

	.stat-label {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-admin-text-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-caps);
	}

	.stat-sublabel {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		margin-top: 0.25rem;
	}
</style>
