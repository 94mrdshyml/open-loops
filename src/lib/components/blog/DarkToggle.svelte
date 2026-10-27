<script lang="ts">
	import { theme } from '$lib/stores/theme';

	const dark = $derived($theme === 'dark');
</script>

<button
	type="button"
	onclick={() => theme.toggle()}
	title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
	class="toggle"
	aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
>
	<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
		<circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.5" />
		<path d="M10 2.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" />
	</svg>
</button>

<style>
	.toggle {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		transition: background-color 120ms ease;
	}

	.toggle:hover {
		background: var(--ink-10);
	}

	.toggle:active {
		background: var(--border);
	}
</style>
