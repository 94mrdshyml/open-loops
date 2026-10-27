<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg';
		href?: string;
		byline?: boolean;
	}

	let { size = 'lg', href = '/', byline = true }: Props = $props();
</script>

<a {href} class="logo-wrap logo-{size}" aria-label="Open Tabs — Home">
	<span class="logo-line"
		><span class="logo-open">Open</span> <span class="logo-tabs">Tabs</span><span
			class="logo-dot"
			aria-hidden="true">.</span
		></span
	>
	{#if byline}
		<span class="logo-byline">by Anurag Singh Jakhar</span>
	{/if}
</a>

<style>
	.logo-wrap {
		display: inline-flex;
		flex-direction: column;
		gap: 6px;
		text-decoration: none;
		color: var(--ink);
		user-select: none;
	}

	.logo-line {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 38px;
		line-height: 1;
		letter-spacing: -0.015em;
		white-space: nowrap;
	}

	.logo-open {
		font-style: italic;
		font-weight: 300;
	}

	.logo-tabs {
		font-weight: 700;
	}

	.logo-dot {
		color: var(--accent);
		font-weight: 700;
	}

	.logo-byline {
		font-family: var(--ui);
		font-weight: 500;
		font-size: 13px;
		line-height: 1;
		color: var(--ink-60);
	}

	.logo-md {
		gap: 5px;
	}

	.logo-md .logo-line {
		font-size: 32px;
	}

	.logo-sm .logo-line {
		font-size: 30px;
	}

	.logo-md .logo-byline,
	.logo-sm .logo-byline {
		font-size: 12px;
	}

	@media (max-width: 1023px) {
		.logo-lg {
			gap: 5px;
		}

		.logo-lg .logo-line {
			font-size: 32px;
		}

		.logo-lg .logo-byline {
			font-size: 12px;
		}
	}

	@media (max-width: 639px) {
		.logo-wrap {
			gap: 4px;
		}

		.logo-lg .logo-line {
			font-size: 28px;
		}

		.logo-md .logo-line,
		.logo-sm .logo-line {
			font-size: 26px;
		}
	}
</style>
