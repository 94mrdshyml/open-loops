<script lang="ts">
	interface Props {
		value: string;
		placeholder?: string;
		rows?: number;
		maxlength?: number;
		disabled?: boolean;
		id?: string;
		name?: string;
		required?: boolean;
	}

	let {
		value = $bindable(''),
		placeholder,
		rows = 4,
		maxlength,
		disabled,
		id,
		name,
		required
	}: Props = $props();

	const near = $derived(maxlength != null && value.length >= maxlength * 0.85);
	const over = $derived(maxlength != null && value.length >= maxlength);
</script>

<div class="wrap">
	<textarea
		{id}
		{name}
		{placeholder}
		{rows}
		{maxlength}
		{disabled}
		{required}
		bind:value
		class="textarea"
	></textarea>
	{#if maxlength != null}
		<span class="counter" class:near class:over>{value.length}/{maxlength}</span>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
	}

	.textarea {
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: var(--color-admin-surface);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		color: var(--color-admin-text);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		line-height: 1.5;
		resize: vertical;
		transition: border-color 0.15s;
	}

	.textarea::placeholder {
		color: var(--color-admin-text-muted);
	}

	.textarea:hover:not(:disabled) {
		border-color: var(--color-admin-text-muted);
	}

	.textarea:focus-visible {
		outline: 2px solid var(--color-admin-accent);
		outline-offset: 1px;
		border-color: var(--color-admin-accent);
	}

	.textarea:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.counter {
		display: block;
		text-align: right;
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		margin-top: 0.25rem;
		font-variant-numeric: tabular-nums;
	}

	.counter.near {
		color: var(--color-status-scheduled);
	}

	.counter.over {
		color: var(--color-status-error);
	}

	.textarea:global([aria-invalid='true']) {
		border-color: var(--color-status-error);
	}
</style>
