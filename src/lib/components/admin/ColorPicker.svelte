<script lang="ts">
	interface Props {
		value: string;
		id?: string;
		name?: string;
		onChange?: (hex: string) => void;
	}

	let { value = $bindable('#e8872a'), id, name, onChange }: Props = $props();

	let inputEl: HTMLInputElement;

	function handleChange(e: Event) {
		const hex = (e.target as HTMLInputElement).value;
		value = hex;
		onChange?.(hex);
	}
</script>

<div class="picker-wrap">
	<button
		type="button"
		class="swatch"
		style="background: {value}"
		onclick={() => inputEl.click()}
		aria-label="Choose colour"
	></button>
	<span class="hex-label">{value}</span>
	<input
		bind:this={inputEl}
		type="color"
		{id}
		{name}
		{value}
		onchange={handleChange}
		class="hidden-input"
		aria-hidden="true"
		tabindex="-1"
	/>
</div>

<style>
	.picker-wrap {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.swatch {
		width: 40px;
		height: 40px;
		padding: 0;
		border-radius: 8px;
		border: 1px solid var(--color-admin-border-strong);
		cursor: pointer;
		flex-shrink: 0;
		transition: border-color 0.15s;
	}

	.swatch:hover {
		border-color: var(--color-admin-text);
	}

	.hex-label {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--color-admin-text-muted);
		text-transform: uppercase;
	}

	.hidden-input {
		position: absolute;
		width: 0;
		height: 0;
		opacity: 0;
		pointer-events: none;
	}

	@media (max-width: 1023px) {
		.swatch {
			width: 44px;
			height: 44px;
		}
	}
</style>
