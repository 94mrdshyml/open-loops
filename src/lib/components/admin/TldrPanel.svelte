<script lang="ts">
	interface Props {
		points: string[];
		generating?: boolean;
		error?: string | null;
		/** id of the form that runs the generate action. The button is outside it, so it points at it. */
		formId?: string;
		/** False on the new-post page, where there is no story to write for yet. */
		canGenerate?: boolean;
		onedit?: () => void;
	}

	let {
		points = $bindable(),
		generating = false,
		error = null,
		formId,
		canGenerate = true,
		onedit
	}: Props = $props();

	// A point box that is still empty does not count as a TL;DR yet.
	const hasText = $derived(points.some((point) => point.trim() !== ''));

	const MAX_POINTS = 5;

	function removePoint(index: number) {
		points = points.filter((_, i) => i !== index);
		onedit?.();
	}

	function addPoint() {
		points = [...points, ''];
		onedit?.();
	}

	function confirmReplace(event: MouseEvent) {
		if (hasText && !confirm('Replace the current TL;DR with a new one?')) {
			event.preventDefault();
		}
	}
</script>

<div class="tldr-panel">
	<p class="hint">
		3 to 5 short points, shown at the top of the story under "In brief". Write your own, or have
		them written for you.
	</p>

	{#if points.length === 0}
		<p class="empty">No TL;DR yet.</p>
	{:else}
		<ol class="points">
			{#each points as point, i (i)}
				<li>
					<textarea
						value={point}
						oninput={(e) => {
							points[i] = e.currentTarget.value;
							onedit?.();
						}}
						rows="4"
						aria-label="TL;DR point {i + 1}"
					></textarea>
					<button
						type="button"
						class="remove"
						aria-label="Remove point {i + 1}"
						onclick={() => removePoint(i)}
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
							aria-hidden="true"
						>
							<path d="M2 2l8 8M10 2l-8 8" />
						</svg>
					</button>
				</li>
			{/each}
		</ol>
	{/if}

	{#if points.length < MAX_POINTS}
		<button type="button" class="add ad-link" onclick={addPoint}>
			{points.length === 0 ? 'Write your own' : 'Add a point'}
		</button>
	{/if}

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	{#if generating}
		<p class="working" role="status">Writing the TL;DR. This takes a few seconds.</p>
	{/if}

	{#if canGenerate}
		<button
			type="submit"
			form={formId}
			class="ad-btn ad-btn--quiet"
			disabled={generating}
			aria-busy={generating}
			onclick={confirmReplace}
		>
			{generating ? 'Writing…' : hasText ? 'Regenerate' : 'Generate TL;DR'}
		</button>
	{/if}
</div>

<style>
	.tldr-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.hint,
	.empty,
	.working {
		margin: 0;
		font-size: var(--text-xs);
		line-height: 1.5;
		color: var(--color-admin-text-muted);
	}

	.points {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	li {
		display: flex;
		align-items: flex-start;
		gap: 0.25rem;
	}

	textarea {
		flex: 1;
		min-width: 0;
		padding: 0.625rem 0.75rem;
		font-size: var(--text-sm);
		font-family: var(--font-sans);
		line-height: 1.5;
		color: var(--color-admin-text);
		background: var(--color-admin-surface);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		resize: vertical;
		transition: border-color 0.15s;
	}

	textarea:hover {
		border-color: var(--color-admin-text-muted);
	}

	textarea:focus-visible {
		outline: 2px solid var(--color-admin-accent);
		outline-offset: 1px;
		border-color: var(--color-admin-accent);
	}

	.remove {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--color-admin-text-muted);
		background: none;
		border: 0;
		border-radius: 8px;
		cursor: pointer;
	}

	.remove:hover {
		color: var(--color-admin-text);
		background: var(--color-admin-surface-hover);
	}

	.add {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		min-height: 32px;
		padding: 0;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 600;
		background: none;
		border: 0;
		cursor: pointer;
	}

	.error {
		margin: 0;
		font-size: var(--text-sm);
		font-weight: 600;
		line-height: 1.45;
		color: var(--color-status-error);
	}

	@media (max-width: 1023px) {
		.remove {
			width: 44px;
			height: 44px;
		}

		.add {
			min-height: 44px;
		}
	}
</style>
