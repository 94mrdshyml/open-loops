<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import { formatDateCompact } from '$lib/utils/format-date';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import StatCard from '$lib/components/admin/StatCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	onMount(() => pageTitle.set('Newsletter'));

	const stats = $derived(data.stats);
	const subscribers = $derived(data.subscribers);
	let askNewsletter = $state(data.askNewsletterOnRegister);
	let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	function sourceLabel(source: string): string {
		if (source === 'registration') return 'Registration';
		if (source === 'subscribe_form') return 'Subscribe form';
		if (source === 'manual') return 'Manual';
		return source;
	}

	function fullName(sub: (typeof subscribers)[number]): string {
		return (sub.firstName && sub.lastName ? `${sub.firstName} ${sub.lastName}` : sub.name) || '—';
	}

	const saveSetting: SubmitFunction = ({ formData }) => {
		const previous = !askNewsletter;
		formData.set('value', askNewsletter ? 'true' : 'false');
		saveState = 'saving';
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				saveState = 'saved';
			} else {
				askNewsletter = previous;
				saveState = 'error';
			}
		};
	};
</script>

<div class="newsletter-page">
	<section>
		<SectionHeading label="Audience" />
		<div class="stats">
			<StatCard label="Total subscribers" value={stats.total.toLocaleString('en-GB')} accent />
			<StatCard label="New this month" value={stats.newThisMonth.toLocaleString('en-GB')} />
			{#each stats.bySource as src (src.source)}
				<StatCard
					label={sourceLabel(src.source)}
					value={src.count.toLocaleString('en-GB')}
					sublabel="by source"
				/>
			{/each}
		</div>
	</section>

	<div class="two-col">
		<section>
			<SectionHeading label="Sign-up" />
			<form method="POST" action="?/toggleAskNewsletter" use:enhance={saveSetting}>
				<label class="switch-row">
					<input
						type="checkbox"
						role="switch"
						class="switch"
						bind:checked={askNewsletter}
						disabled={saveState === 'saving'}
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					/>
					<span class="switch-text">
						<span class="switch-label">Ask for newsletter opt-in on registration</span>
						<span class="switch-hint">
							{askNewsletter
								? 'New readers see a tick box to join the newsletter when they create an account.'
								: 'New readers are not asked. They can still subscribe from the site.'}
						</span>
					</span>
				</label>
				<p class="save-note" class:is-error={saveState === 'error'} role="status">
					{#if saveState === 'saving'}
						Saving
					{:else if saveState === 'saved'}
						<span class="tick" aria-hidden="true">✓</span> Saved
					{:else if saveState === 'error'}
						Could not save. Check your connection and try again.
					{/if}
				</p>
			</form>
		</section>

		<section>
			<SectionHeading label="Send a newsletter" />
			<p class="send-note">
				Sending from the dashboard is not ready yet. Nothing on this page sends email.
			</p>
			<button type="button" class="ad-btn" disabled aria-describedby="compose-note">
				Compose newsletter
			</button>
			<p class="soon" id="compose-note">Coming soon</p>
		</section>
	</div>

	<section>
		<SectionHeading
			label="Recent subscribers"
			meta={subscribers.length > 0 ? `Latest ${subscribers.length}` : undefined}
		/>

		{#if subscribers.length === 0}
			<EmptyState
				message="No subscribers yet"
				sublabel="People appear here when they subscribe on the site or tick the newsletter box when they register."
			/>
		{:else}
			<div class="subs">
				<AdminTable columns={['Email', 'Name', 'Source', 'Subscribed']}>
					{#each subscribers as sub (sub.id)}
						<tr>
							<td class="c-email">{sub.email}</td>
							<td class="c-name">{fullName(sub)}</td>
							<td class="c-source">
								{#if sub.source}
									<span class="source">{sourceLabel(sub.source)}</span>
								{:else}
									<span class="ad-muted">—</span>
								{/if}
							</td>
							<td class="c-date">{formatDateCompact(sub.subscribedAt, true) || '—'}</td>
						</tr>
					{/each}
				</AdminTable>
			</div>
		{/if}
	</section>
</div>

<style>
	.newsletter-page {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: 1.5rem;
	}

	.two-col {
		display: grid;
		grid-template-columns: 3fr 2fr;
		gap: 2.5rem;
		align-items: start;
	}

	/* Switch */
	.switch-row {
		display: flex;
		align-items: flex-start;
		gap: 0.875rem;
		min-height: 44px;
		cursor: pointer;
	}

	.switch {
		appearance: none;
		flex-shrink: 0;
		position: relative;
		width: 44px;
		height: 26px;
		margin: 0.125rem 0 0;
		background: var(--color-admin-surface-hover);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 999px;
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}

	.switch::before {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--color-admin-text-muted);
		transition:
			transform 0.15s,
			background-color 0.15s;
	}

	.switch:checked {
		background: var(--color-admin-text);
		border-color: var(--color-admin-text);
	}

	.switch:checked::before {
		background: var(--color-admin-bg);
		transform: translateX(18px);
	}

	.switch:disabled {
		opacity: 0.55;
		cursor: wait;
	}

	.switch-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.switch-label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
	}

	.switch-hint {
		max-width: 46ch;
		font-size: var(--text-xs);
		line-height: 1.5;
		color: var(--color-admin-text-muted);
	}

	.save-note {
		min-height: 1.25rem;
		margin: 0.5rem 0 0 calc(44px + 0.875rem);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-status-published);
	}

	.save-note.is-error {
		color: var(--color-status-error);
	}

	/* Send */
	.send-note {
		margin: 0 0 1rem;
		max-width: 40ch;
		font-size: var(--text-sm);
		line-height: 1.5;
		color: var(--color-admin-text-muted);
	}

	.soon {
		margin: 0.5rem 0 0;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-admin-text-muted);
	}

	/* Subscribers */
	.subs :global(.table-wrap) {
		border-top: none;
	}

	.c-email {
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.c-date {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		white-space: nowrap;
	}

	.source {
		display: inline-flex;
		padding: 0.2em 0.65em;
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 999px;
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
	}

	@media (max-width: 1023px) {
		.two-col {
			grid-template-columns: 1fr;
		}
	}

	/* Mobile: each subscriber is a stacked row, email first */
	@media (max-width: 767px) {
		.subs :global(.table-wrap) {
			overflow-x: visible;
		}

		.subs :global(table),
		.subs :global(tbody) {
			display: block;
		}

		.subs :global(thead) {
			display: none;
		}

		.subs :global(tbody tr) {
			display: grid;
			grid-template-columns: 1fr auto;
			grid-template-areas:
				'email email'
				'name source'
				'date date';
			gap: 0.375rem 1rem;
			align-items: center;
			padding: 0.875rem 0;
			border-bottom: 1px solid var(--color-admin-border);
		}

		.subs :global(tbody tr:hover) {
			background: transparent;
		}

		.subs :global(tbody td) {
			display: block;
			padding: 0;
		}

		.c-email {
			grid-area: email;
		}

		.c-name {
			grid-area: name;
			font-size: var(--text-xs);
			color: var(--color-admin-text-muted);
		}

		.c-source {
			grid-area: source;
		}

		.c-date {
			grid-area: date;
		}
	}

	@media (max-width: 599px) {
		.stats {
			grid-template-columns: repeat(2, 1fr);
			gap: 1.25rem 1rem;
		}
	}
</style>
