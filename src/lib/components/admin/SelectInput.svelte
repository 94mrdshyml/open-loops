<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		value: string;
		options: Option[];
		placeholder?: string;
		disabled?: boolean;
		id?: string;
		name?: string;
	}

	let { value = $bindable(''), options, placeholder, disabled, id, name }: Props = $props();
</script>

<div class="select-wrap">
	<select {id} {name} {disabled} bind:value class="select">
		{#if placeholder}
			<option value="" disabled selected={value === ''}>{placeholder}</option>
		{/if}
		{#each options as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	<span class="arrow" aria-hidden="true">
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	</span>
</div>

<style>
	.select-wrap {
		position: relative;
		width: 100%;
	}

	.select {
		width: 100%;
		min-height: 40px;
		padding: 0.5rem 2rem 0.5rem 0.75rem;
		background: var(--color-admin-surface);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		color: var(--color-admin-text);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		appearance: none;
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.select:hover:not(:disabled) {
		border-color: var(--color-admin-text-muted);
	}

	.select:focus-visible {
		outline: 2px solid var(--color-admin-accent);
		outline-offset: 1px;
		border-color: var(--color-admin-accent);
	}

	.select:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.arrow {
		position: absolute;
		right: 0.625rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-admin-text-muted);
		pointer-events: none;
		display: flex;
	}

	.select:global([aria-invalid='true']) {
		border-color: var(--color-status-error);
	}

	@media (max-width: 1023px) {
		.select {
			min-height: 44px;
		}
	}
</style>
