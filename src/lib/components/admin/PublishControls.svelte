<script lang="ts">
	import SectionHeading from './SectionHeading.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import type { PostStatus } from '$lib/types/index';
	import { isOverdue } from '$lib/utils/schedule';

	type SaveState = 'idle' | 'saving' | 'unsaved' | 'saved' | 'error';

	interface Props {
		status: PostStatus;
		publishedAt: Date | null;
		isFeatured: boolean;
		saving: boolean;
		/** What the last save did, shown beside the heading. */
		saveState?: SaveState;
		/** The words that go with the save state, such as "Saved 14:32". */
		saveText?: string;
		/** Keyboard shortcuts, shown quietly under the buttons on desktop. */
		shortcuts?: string;
		onSaveDraft?: () => void;
		onPublish?: () => void;
		onUnpublish?: () => void;
		onSchedule?: (date: Date) => void;
		onStatusChange?: (status: PostStatus) => void;
		onFeaturedChange?: (val: boolean) => void;
	}

	let {
		status = $bindable('draft'),
		publishedAt = $bindable(null),
		isFeatured = $bindable(false),
		saving,
		saveState = 'idle',
		saveText = '',
		shortcuts,
		onSaveDraft,
		onPublish,
		onUnpublish,
		onSchedule,
		onStatusChange,
		onFeaturedChange
	}: Props = $props();

	let scheduleValue = $state('');
	let showSchedule = $state(false);

	const isPublished = $derived(status === 'published');
	const isDraft = $derived(status === 'draft');
	const isScheduled = $derived(status === 'scheduled');

	// Ticks so the warning appears while the page stays open
	let nowMs = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (nowMs = Date.now()), 30_000);
		return () => clearInterval(timer);
	});
	const overdue = $derived(isOverdue(status, publishedAt, nowMs));

	const dateText = $derived(
		publishedAt
			? publishedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
			: ''
	);

	// What each click will do, in plain words
	const hint = $derived(
		isPublished
			? 'Update saves your changes to the live story. Unpublish takes it back to a draft.'
			: overdue
				? `This story was due on ${dateText} and is not live yet. It should go live within a minute. Reload to check, or publish now.`
				: isScheduled
					? `Goes live on ${dateText || 'the date you set'}. Save to keep the schedule, or publish now.`
					: 'Save draft keeps the story private. Publish puts it live straight away.'
	);

	function handlePublish() {
		status = 'published';
		onPublish?.();
	}

	function handleSaveDraft() {
		if (isPublished) {
			status = 'draft';
			onUnpublish?.();
		} else {
			onSaveDraft?.();
		}
	}

	function handleSchedule() {
		if (!scheduleValue) return;
		const date = new Date(scheduleValue);
		status = 'scheduled';
		publishedAt = date;
		onStatusChange?.('scheduled');
		onSchedule?.(date);
		showSchedule = false;
	}
</script>

<!-- The save state sits beside the heading on desktop and in the bottom bar on small screens -->
{#snippet note()}
	{#if saveState !== 'idle' && saveText}
		<span class="save-note {saveState}">
			<span class="save-mark" aria-hidden="true">
				{#if saveState === 'saved'}✓{:else if saveState === 'error'}!{:else}•{/if}
			</span>
			{saveText}
		</span>
	{/if}
{/snippet}

{#snippet buttons()}
	<button type="button" class="ad-btn ad-btn--quiet" onclick={handleSaveDraft} disabled={saving}>
		{#if saving}Saving…{:else if isPublished}Unpublish{:else if isScheduled}Save schedule{:else}Save
			draft{/if}
	</button>
	{#if !isPublished}
		<button type="button" class="ad-btn" onclick={handlePublish} disabled={saving}>
			{isScheduled ? 'Publish now' : 'Publish'}
		</button>
	{:else}
		<button type="button" class="ad-btn" onclick={() => onPublish?.()} disabled={saving}>
			Update
		</button>
	{/if}
{/snippet}

<section class="publish">
	<SectionHeading label="Publish">
		{#snippet actions()}
			<span class="note-desktop" role="status">{@render note()}</span>
		{/snippet}
	</SectionHeading>

	<dl class="facts">
		<div class="fact">
			<dt>Status</dt>
			<dd><StatusBadge {status} {overdue} /></dd>
		</div>
		{#if publishedAt && (isPublished || isScheduled)}
			<div class="fact">
				<dt>{isScheduled ? 'Scheduled for' : 'Published'}</dt>
				<dd>{dateText}</dd>
			</div>
		{/if}
	</dl>

	<label class="toggle-label" for="featured-toggle">
		<span>Featured post</span>
		<span class="toggle">
			<span class="toggle-state" aria-hidden="true">{isFeatured ? 'On' : 'Off'}</span>
			<input
				id="featured-toggle"
				type="checkbox"
				role="switch"
				bind:checked={isFeatured}
				onchange={() => onFeaturedChange?.(isFeatured)}
				class="sr-only"
			/>
			<span class="toggle-track" class:on={isFeatured} aria-hidden="true">
				<span class="toggle-thumb"></span>
			</span>
		</span>
	</label>

	<div class="actions">
		{@render buttons()}
	</div>

	<p class="hint">{hint}</p>
	{#if shortcuts}<p class="hint shortcuts">{shortcuts}</p>{/if}

	{#if isDraft || isScheduled}
		<div class="schedule">
			<button
				type="button"
				class="schedule-toggle"
				aria-expanded={showSchedule}
				aria-controls="schedule-panel"
				onclick={() => (showSchedule = !showSchedule)}
			>
				<span class="chevron" class:open={showSchedule} aria-hidden="true">▾</span>
				Schedule for later
			</button>
			{#if showSchedule}
				<div class="schedule-row" id="schedule-panel">
					<label class="schedule-label" for="schedule-at">Publish on</label>
					<div class="schedule-fields">
						<input
							id="schedule-at"
							type="datetime-local"
							bind:value={scheduleValue}
							class="schedule-input"
							min={new Date().toISOString().slice(0, 16)}
						/>
						<button
							type="button"
							class="ad-btn ad-btn--quiet"
							onclick={handleSchedule}
							disabled={!scheduleValue}
						>
							Set date
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</section>

<!-- Small screens: status and the two main buttons stay at the bottom of the screen -->
<div class="bar" role="region" aria-label="Publish">
	<div class="bar-left">
		<StatusBadge {status} {overdue} />
		<span class="note-bar" role="status">{@render note()}</span>
	</div>
	<div class="bar-actions">
		{@render buttons()}
	</div>
</div>

<style>
	.publish {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.publish :global(.section-heading) {
		margin-bottom: 0;
	}

	.facts {
		display: flex;
		flex-direction: column;
		margin: 0;
	}

	.fact {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 36px;
		border-bottom: 1px solid var(--color-admin-border);
		font-size: var(--text-sm);
	}

	.fact dt {
		color: var(--color-admin-text-muted);
	}

	.fact dd {
		margin: 0;
		color: var(--color-admin-text);
		font-weight: 500;
	}

	.save-note {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-admin-text-muted);
		white-space: nowrap;
	}

	.save-note.saved {
		color: var(--color-status-published);
	}

	.save-note.unsaved {
		color: var(--color-status-scheduled);
	}

	.save-note.error {
		color: var(--color-status-error);
	}

	.save-mark {
		font-weight: 700;
	}

	/* ── Featured toggle ──────────────────────────────────────── */
	.toggle-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 44px;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
		cursor: pointer;
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.625rem;
	}

	.toggle-state {
		min-width: 1.5rem;
		text-align: right;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-admin-text-muted);
	}

	.toggle-track {
		position: relative;
		width: 40px;
		height: 24px;
		background: transparent;
		border: 2px solid var(--color-admin-text-muted);
		border-radius: 12px;
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}

	.toggle-track.on {
		background: var(--color-admin-accent);
		border-color: var(--color-admin-accent);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		background: var(--color-admin-text-muted);
		border-radius: 50%;
		transition:
			transform 0.15s,
			background-color 0.15s;
	}

	.toggle-track.on .toggle-thumb {
		background: var(--color-admin-bg);
		transform: translateX(16px);
	}

	.sr-only:focus-visible + .toggle-track {
		outline: 2px solid var(--color-admin-accent);
		outline-offset: 3px;
	}

	/* ── Buttons and hints ────────────────────────────────────── */
	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.actions :global(.ad-btn) {
		flex: 1;
	}

	.hint {
		margin: 0;
		font-size: var(--text-xs);
		line-height: 1.5;
		color: var(--color-admin-text-muted);
	}

	/* Keys mean nothing on a touch screen */
	@media (hover: none) {
		.shortcuts {
			display: none;
		}
	}

	.schedule {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.25rem;
		border-top: 1px solid var(--color-admin-border);
	}

	.schedule-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		align-self: flex-start;
		min-height: 44px;
		padding: 0;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
		background: none;
		border: 0;
		cursor: pointer;
	}

	.schedule-toggle:hover {
		color: var(--color-admin-accent);
	}

	.chevron {
		display: inline-block;
		transition: transform 0.15s;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.schedule-row {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.schedule-label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
	}

	.schedule-fields {
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
	}

	.schedule-input {
		flex: 1;
		min-width: 0;
		min-height: 40px;
		padding: 0 0.625rem;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		color: var(--color-admin-text);
		background: var(--color-admin-surface);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
	}

	.schedule-input:focus-visible {
		outline: 2px solid var(--color-admin-accent);
		outline-offset: 1px;
		border-color: var(--color-admin-accent);
	}

	/* ── Bottom bar for small screens ─────────────────────────── */
	.bar {
		display: none;
	}

	.note-bar {
		display: block;
	}

	@media (max-width: 1099px) {
		.note-desktop,
		.actions,
		.shortcuts {
			display: none;
		}

		.bar {
			position: fixed;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 30;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 0.75rem;
			padding: 0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom));
			background: var(--color-admin-bg);
			border-top: 2px solid var(--color-admin-text);
		}

		.bar-left {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
			min-width: 0;
		}

		.bar-actions {
			display: flex;
			gap: 0.5rem;
		}

		.schedule-input {
			min-height: 44px;
		}
	}

	/* The rail beside the page is 64px wide on tablets */
	@media (min-width: 768px) and (max-width: 1099px) {
		.bar {
			left: 64px;
		}
	}

	@media (min-width: 1100px) {
		.note-bar {
			display: none;
		}
	}

	@media (max-width: 400px) {
		.bar-actions :global(.ad-btn) {
			padding: 0 0.75rem;
		}
	}
</style>
