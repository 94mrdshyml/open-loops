<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		error?: string | null;
		required?: boolean;
		hint?: string;
		fieldId?: string;
		children: Snippet;
	}

	let { label, error, required, hint, fieldId, children }: Props = $props();

	const errorId = $derived(fieldId ? `${fieldId}-error` : undefined);
	const hintId = $derived(fieldId ? `${fieldId}-hint` : undefined);

	// Ties the message to the field inside it, so a screen reader reads the hint or the error
	// with the field and the field is marked invalid. Works for any input with this id.
	$effect(() => {
		if (!fieldId) return;
		const el = document.getElementById(fieldId);
		if (!el) return;
		const describedBy = error ? errorId : hint ? hintId : undefined;
		if (describedBy) el.setAttribute('aria-describedby', describedBy);
		else el.removeAttribute('aria-describedby');
		if (error) el.setAttribute('aria-invalid', 'true');
		else el.removeAttribute('aria-invalid');
	});
</script>

<div class="field">
	<label class="field-label" for={fieldId}>
		{label}{#if required}<span class="required" aria-hidden="true"> *</span>{/if}
	</label>
	{@render children()}
	{#if error}
		<p class="field-error" id={errorId} role="alert">{error}</p>
	{/if}
	{#if hint && !error}
		<p class="field-hint" id={hintId}>{hint}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
	}

	.required {
		color: var(--color-status-error);
	}

	.field-error {
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--color-status-error);
	}

	.field-hint {
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}
</style>
