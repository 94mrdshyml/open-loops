<script lang="ts">
	interface Props {
		value: string;
		placeholder?: string;
		type?: 'text' | 'email' | 'url' | 'password';
		disabled?: boolean;
		readonly?: boolean;
		id?: string;
		name?: string;
		required?: boolean;
		oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
		onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
	}

	let {
		value = $bindable(''),
		placeholder,
		type = 'text',
		disabled,
		readonly,
		id,
		name,
		required,
		oninput,
		onchange
	}: Props = $props();
</script>

<input
	{type}
	{id}
	{name}
	{placeholder}
	{disabled}
	{readonly}
	{required}
	bind:value
	{oninput}
	{onchange}
	class="text-input"
	class:disabled
/>

<style>
	.text-input {
		width: 100%;
		min-height: 40px;
		padding: 0.5rem 0.75rem;
		background: var(--color-admin-surface);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		color: var(--color-admin-text);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		transition: border-color 0.15s;
	}

	.text-input::placeholder {
		color: var(--color-admin-text-muted);
	}

	.text-input:hover:not(:disabled) {
		border-color: var(--color-admin-text-muted);
	}

	.text-input:focus-visible {
		outline: 2px solid var(--color-admin-accent);
		outline-offset: 1px;
		border-color: var(--color-admin-accent);
	}

	.text-input.disabled,
	.text-input:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.text-input:global([aria-invalid='true']) {
		border-color: var(--color-status-error);
	}

	@media (max-width: 1023px) {
		.text-input {
			min-height: 44px;
		}
	}
</style>
