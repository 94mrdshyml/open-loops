<script lang="ts">
	import { heroImage, cardImage, thumbnailImage } from '$lib/utils/image-url';

	interface Props {
		src: string | null;
		href: string;
		/** Shown on the blank tab when there is no cover. */
		categoryName?: string | null;
		preset?: 'hero' | 'card' | 'thumb';
		/** Wide 1200×630 frame instead of 16:9. */
		og?: boolean;
		/** Blank tab size: matches the type size of the slot it sits in. */
		blank?: 'lg' | 'md' | 'sm' | 'none';
		eager?: boolean;
	}

	let {
		src,
		href,
		categoryName = null,
		preset = 'card',
		og = false,
		blank = 'md',
		eager = false
	}: Props = $props();

	const sized = $derived.by(() => {
		if (!src) return null;
		const fn = preset === 'hero' ? heroImage : preset === 'thumb' ? thumbnailImage : cardImage;
		return fn(src) ?? src;
	});
	const dims = $derived(
		preset === 'hero' ? [1200, 630] : preset === 'thumb' ? [320, 180] : [640, 360]
	);
</script>

{#if sized}
	<a {href} class="cover" class:og tabindex="-1" aria-hidden="true">
		<img
			src={sized}
			alt=""
			width={dims[0]}
			height={dims[1]}
			loading={eager ? 'eager' : 'lazy'}
			fetchpriority={eager ? 'high' : undefined}
		/>
	</a>
{:else if blank !== 'none'}
	<!-- A story with no cover becomes a blank tab with its category name -->
	<a {href} class="blank blank-{blank}" class:og tabindex="-1" aria-hidden="true">
		<span class="blank-ear"></span>
		<span class="blank-body">{categoryName ?? ''}</span>
	</a>
{/if}

<style>
	.cover {
		display: block;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		background: var(--paper2);
	}

	.og {
		aspect-ratio: 1200 / 630;
	}

	.cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.blank {
		display: flex;
		flex-direction: column;
		text-decoration: none;
	}

	.blank-ear {
		width: 96px;
		height: 12px;
		background: var(--paper2);
		border-radius: 8px 8px 0 0;
	}

	.blank-body {
		aspect-ratio: 16 / 9;
		margin-top: -1px;
		background: var(--paper2);
		display: flex;
		align-items: flex-end;
		padding: 18px 20px;
		font-family: var(--serif);
		font-style: italic;
		font-size: 44px;
		line-height: 1;
		color: var(--ink-60);
	}

	.og .blank-body {
		aspect-ratio: 1200 / 630;
	}

	.blank-lg .blank-body {
		font-size: 56px;
		padding: 24px 28px;
	}

	.blank-sm .blank-ear {
		width: 64px;
		height: 10px;
		border-radius: 7px 7px 0 0;
	}

	.blank-sm .blank-body {
		padding: 12px 14px;
		font-size: 26px;
	}

	@media (max-width: 1023px) {
		.blank-md .blank-ear {
			width: 72px;
			height: 10px;
			border-radius: 7px 7px 0 0;
		}

		.blank-md .blank-body {
			padding: 14px 16px;
			font-size: 32px;
		}

		.blank-sm .blank-ear {
			width: 54px;
			height: 9px;
			border-radius: 6px 6px 0 0;
		}

		.blank-sm .blank-body {
			padding: 10px 12px;
			font-size: 22px;
		}
	}

	@media (max-width: 639px) {
		.blank-md .blank-body,
		.blank-lg .blank-body {
			font-size: 34px;
			padding: 14px 20px;
		}
	}
</style>
