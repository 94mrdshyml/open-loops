<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		/** Small text under the rule's left end, such as a count. */
		meta?: string;
		/** Buttons or links that sit at the right end of the rule. */
		actions?: Snippet;
		headingLevel?: 2 | 3;
		/** Lets a surrounding section point at this heading with aria-labelledby. */
		id?: string;
	}

	let { label, meta, actions, headingLevel = 2, id }: Props = $props();
</script>

<div class="section-heading">
	<svelte:element this={`h${headingLevel}`} class="ear" {id}>{label}</svelte:element>
	{#if meta}<span class="meta">{meta}</span>{/if}
	{#if actions}
		<div class="actions">{@render actions()}</div>
	{/if}
</div>

<style>
	/* The ear: a dark tab on a heavy rule, as on the public site */
	.section-heading {
		display: flex;
		align-items: flex-end;
		gap: 0.875rem;
		border-bottom: 2px solid var(--color-admin-text);
		margin-bottom: 1.25rem;
	}

	.ear {
		font-family: var(--font-sans);
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1;
		margin: 0;
		padding: 10px 16px 8px;
		color: var(--color-admin-bg);
		background: var(--color-admin-text);
		border-radius: 8px 8px 0 0;
		flex-shrink: 0;
	}

	.meta {
		align-self: center;
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.actions {
		margin-left: auto;
		align-self: center;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-bottom: 0.25rem;
	}
</style>
