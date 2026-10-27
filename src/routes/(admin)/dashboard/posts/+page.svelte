<script lang="ts">
	import { onMount } from 'svelte';
	import { deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import Pagination from '$lib/components/admin/Pagination.svelte';
	import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast';
	import { isOverdue } from '$lib/utils/schedule';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	onMount(() => pageTitle.set('Posts'));

	let deleteError = $state<string | null>(null);

	interface DeleteTarget {
		id: string;
		title: string;
	}
	let deleteTarget = $state<DeleteTarget | null>(null);
	let deleteFormEl: HTMLFormElement;

	function formatDate(d: Date | null, fallback: Date): string {
		const date = d ?? fallback;
		return new Date(date).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function truncate(s: string, n: number): string {
		return s.length > n ? s.slice(0, n) + '…' : s;
	}

	const filtersActive = $derived(
		Boolean(
			data.filters.search || data.filters.status || data.filters.category || data.filters.tldr
		)
	);

	const statusOptions: { value: string; label: string }[] = [
		{ value: '', label: 'All statuses' },
		{ value: 'published', label: 'Published' },
		{ value: 'draft', label: 'Draft' },
		{ value: 'scheduled', label: 'Scheduled' },
		{ value: 'archived', label: 'Archived' }
	];

	// ─── Write the missing TL;DRs, one story per request ─────────────────────────
	interface BulkReply {
		finished: boolean;
		ok?: boolean;
		title?: string;
		postId?: string;
		message?: string;
		stop?: boolean;
	}

	const MAX_FAILURES_IN_A_ROW = 5;

	let bulkRunning = $state(false);
	let bulkStopRequested = false;
	let bulkDone = $state(0);
	let bulkFailed = $state(0);
	let bulkTotal = $state(0);
	let bulkLatest = $state('');
	let bulkMessage = $state<string | null>(null);

	async function runBulk() {
		const count = data.missingTldr;
		if (
			!confirm(
				`Write a TL;DR for ${count} published ${count === 1 ? 'story' : 'stories'}, one at a time? ` +
					'The free model allows 50 requests a day, so a long run can stop early. ' +
					'You can press Stop at any time and run it again later.'
			)
		) {
			return;
		}

		bulkRunning = true;
		bulkStopRequested = false;
		bulkDone = 0;
		bulkFailed = 0;
		bulkTotal = count;
		bulkLatest = '';
		bulkMessage = null;

		const skip: string[] = [];
		let failuresInARow = 0;
		let endNote: string | null = null;

		while (!bulkStopRequested) {
			const body = new FormData();
			body.set('skip', skip.join(','));

			let reply: BulkReply;
			try {
				const response = await fetch('?/generateNextTldr', {
					method: 'POST',
					body,
					headers: { 'x-sveltekit-action': 'true' }
				});
				const result = deserialize(await response.text());
				if (result.type !== 'success' || !result.data) throw new Error('bad reply');
				reply = result.data as unknown as BulkReply;
			} catch {
				endNote = 'Lost contact with the server. Run it again to carry on.';
				break;
			}

			if (reply.finished) break;
			bulkLatest = reply.title ?? '';

			if (reply.ok) {
				bulkDone += 1;
				failuresInARow = 0;
				continue;
			}

			bulkFailed += 1;
			failuresInARow += 1;
			if (reply.postId) skip.push(reply.postId);
			if (reply.stop) {
				endNote = reply.message ?? 'Stopped.';
				break;
			}
			if (failuresInARow >= MAX_FAILURES_IN_A_ROW) {
				endNote = `${MAX_FAILURES_IN_A_ROW} stories failed in a row, so it stopped. Last reason: ${reply.message ?? 'unknown'}`;
				break;
			}
		}

		const wrote = `Wrote ${bulkDone} ${bulkDone === 1 ? 'TL;DR' : 'TL;DRs'}`;
		const failed = bulkFailed > 0 ? `, ${bulkFailed} could not be written` : '';
		const stoppedByWriter = bulkStopRequested && !endNote;
		bulkMessage = `${wrote}${failed}. ${stoppedByWriter ? 'Stopped.' : (endNote ?? '')}`.trim();
		bulkRunning = false;
		await invalidateAll();
	}

	const tldrOptions: { value: string; label: string }[] = [
		{ value: '', label: 'Any TL;DR' },
		{ value: 'missing', label: 'Missing TL;DR' },
		{ value: 'present', label: 'Has TL;DR' }
	];
</script>

<div class="posts-page">
	<SectionHeading
		label="Stories"
		meta={`${data.totalCount} ${data.totalCount === 1 ? 'story' : 'stories'}${filtersActive ? ' match' : ''}`}
	>
		{#snippet actions()}
			<a href="/dashboard/posts/new" class="ad-btn">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					aria-hidden="true"
				>
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				New story
			</a>
		{/snippet}
	</SectionHeading>

	<form method="GET" class="ad-toolbar filters" aria-label="Filter stories">
		<div class="field field-search">
			<label for="f-search" class="sr-only">Search stories</label>
			<input
				id="f-search"
				type="search"
				name="search"
				value={data.filters.search ?? ''}
				placeholder="Search stories"
				class="control"
			/>
		</div>

		<div class="field">
			<label for="f-status" class="sr-only">Status</label>
			<select id="f-status" name="status" class="control">
				{#each statusOptions as opt (opt.value)}
					<option
						value={opt.value}
						selected={data.filters.status === opt.value ||
							(!data.filters.status && opt.value === '')}
					>
						{opt.label}
					</option>
				{/each}
			</select>
		</div>

		<div class="field">
			<label for="f-category" class="sr-only">Category</label>
			<select id="f-category" name="category" class="control">
				<option value="" selected={!data.filters.category}>All categories</option>
				{#each data.categories as cat (cat.id)}
					<option value={cat.slug} selected={data.filters.category === cat.slug}>
						{cat.name}
					</option>
				{/each}
			</select>
		</div>

		<div class="field">
			<label for="f-tldr" class="sr-only">TL;DR</label>
			<select id="f-tldr" name="tldr" class="control">
				{#each tldrOptions as opt (opt.value)}
					<option
						value={opt.value}
						selected={data.filters.tldr === opt.value || (!data.filters.tldr && opt.value === '')}
					>
						{opt.label}
					</option>
				{/each}
			</select>
		</div>

		<button type="submit" class="ad-btn ad-btn--quiet">Apply filters</button>
		{#if filtersActive}
			<a href="/dashboard/posts" class="ad-link clear">Clear filters</a>
		{/if}
	</form>

	{#if deleteError}
		<div class="banner" role="alert">{deleteError}</div>
	{/if}

	{#if form && 'message' in form && form.message}
		<div class="banner" role="alert">{form.message}</div>
	{/if}

	{#if data.missingTldr > 0 || bulkRunning || bulkMessage}
		<div class="bulk-strip" role="status" aria-live="polite">
			{#if bulkRunning}
				<div class="bulk-text">
					<span>
						Writing TL;DRs: {bulkDone} of {bulkTotal} done{bulkFailed > 0
							? `, ${bulkFailed} failed`
							: ''}.
					</span>
					{#if bulkLatest}<span class="bulk-latest">{bulkLatest}</span>{/if}
					<progress
						class="bulk-progress"
						max={bulkTotal}
						value={bulkDone + bulkFailed}
						aria-label="TL;DRs written"
					></progress>
				</div>
				<button
					type="button"
					class="ad-btn ad-btn--quiet ad-btn--sm"
					onclick={() => (bulkStopRequested = true)}
				>
					Stop
				</button>
			{:else}
				<p class="bulk-text">
					{#if bulkMessage}{bulkMessage}{/if}
					{#if data.missingTldr > 0}
						{data.missingTldr} published {data.missingTldr === 1 ? 'story has' : 'stories have'} no TL;DR.
					{/if}
				</p>
				{#if data.missingTldr > 0}
					<button type="button" class="ad-btn ad-btn--quiet ad-btn--sm" onclick={runBulk}>
						Write them now
					</button>
				{/if}
			{/if}
		</div>
	{/if}

	{#if data.posts.length > 0}
		<div class="list">
			<AdminTable columns={['Story', 'Category', 'Status', 'TL;DR', 'Featured', 'Date', 'Actions']}>
				{#each data.posts as post (post.id)}
					<tr class="row">
						<td class="cell-story">
							<div class="story">
								{#if post.featuredImage}
									<img src={post.featuredImage} alt="" class="thumb" loading="lazy" />
								{:else}
									<div class="thumb thumb-placeholder" aria-hidden="true"></div>
								{/if}
								<div class="story-text">
									<span class="post-title">{post.title}</span>
									{#if post.subtitle}
										<span class="post-subtitle">{truncate(post.subtitle, 90)}</span>
									{/if}
									{#if post.authorName}
										<span class="post-author">By {post.authorName}</span>
									{/if}
								</div>
							</div>
						</td>

						<td class="cell-category">
							{#if post.categoryName}
								<span class="category">{post.categoryName}</span>
							{:else}
								<span class="ad-muted">No category</span>
							{/if}
						</td>

						<td class="cell-status">
							<StatusBadge
								status={post.status as 'draft' | 'published' | 'scheduled' | 'archived'}
								overdue={isOverdue(post.status, post.publishedAt)}
							/>
						</td>

						<td class="cell-tldr">
							{#if post.hasTldr}
								<span class="tldr-mark tldr-yes" title="Has a TL;DR">
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<circle cx="12" cy="12" r="9" />
										<polyline points="8 12.5 11 15.5 16 9" />
									</svg>
									<span class="tldr-text">Has a TL;DR</span>
								</span>
							{:else}
								<span class="tldr-mark tldr-no" title="No TL;DR yet">
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										aria-hidden="true"
									>
										<circle cx="12" cy="12" r="9" stroke-dasharray="3 3.2" />
										<line x1="8.5" y1="12" x2="15.5" y2="12" />
									</svg>
									<span class="tldr-text">No TL;DR yet</span>
								</span>
							{/if}
						</td>

						<td class="cell-featured">
							<form
								method="POST"
								action="?/toggleFeatured"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											toast.success(
												post.isFeatured ? 'Removed from featured' : 'Marked as featured'
											);
											await invalidateAll();
										} else if (result.type === 'failure') {
											toast.error(
												(result.data as { message?: string })?.message ?? 'Update failed'
											);
										}
										await update({ reset: false });
									};
								}}
							>
								<input type="hidden" name="postId" value={post.id} />
								<input type="hidden" name="featured" value={String(!post.isFeatured)} />
								<button
									type="submit"
									class="icon-btn featured-toggle"
									class:active={post.isFeatured}
									title={post.isFeatured ? 'Remove from featured' : 'Mark as featured'}
									aria-label={post.isFeatured
										? `Remove ${post.title} from featured`
										: `Mark ${post.title} as featured`}
								>
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill={post.isFeatured ? 'currentColor' : 'none'}
										stroke="currentColor"
										stroke-width="2"
										aria-hidden="true"
									>
										<polygon
											points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
										/>
									</svg>
								</button>
							</form>
						</td>

						<td class="cell-date">
							{#if post.status !== 'published'}<span class="date-prefix"
									>Updated
								</span>{/if}{formatDate(
								post.status === 'published' ? post.publishedAt : null,
								post.updatedAt
							)}
						</td>

						<td class="cell-actions">
							<div class="actions">
								<a
									href="/dashboard/posts/{post.id}/edit"
									class="icon-btn"
									title="Edit"
									aria-label="Edit {post.title}"
								>
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										aria-hidden="true"
									>
										<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
										<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
									</svg>
								</a>

								<a
									href="/posts/{post.slug}"
									target="_blank"
									rel="noopener noreferrer"
									class="icon-btn"
									title="Preview"
									aria-label="Preview {post.title} (opens in a new tab)"
								>
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										aria-hidden="true"
									>
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
										<circle cx="12" cy="12" r="3" />
									</svg>
								</a>

								<button
									type="button"
									class="icon-btn icon-delete"
									title="Delete"
									aria-label="Delete {post.title}"
									onclick={() => (deleteTarget = { id: post.id, title: post.title })}
								>
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										aria-hidden="true"
									>
										<polyline points="3 6 5 6 21 6" />
										<path d="M19 6l-1 14H6L5 6" />
										<path d="M10 11v6M14 11v6" />
										<path d="M9 6V4h6v2" />
									</svg>
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</AdminTable>
		</div>

		<div class="pagination-wrap">
			<p class="count-label">
				{data.totalCount}
				{data.totalCount === 1 ? 'story' : 'stories'}
			</p>
			<Pagination currentPage={data.page} totalPages={data.totalPages} baseUrl="/dashboard/posts" />
		</div>
	{:else if filtersActive}
		<EmptyState
			message="No stories match"
			sublabel="Try a different search, or clear the filters to see every story."
			action={{ label: 'Clear filters', href: '/dashboard/posts' }}
		/>
	{:else}
		<EmptyState
			message="No stories yet"
			sublabel="Write your first story and it will appear here."
			action={{ label: 'New story', href: '/dashboard/posts/new' }}
		/>
	{/if}
</div>

<!-- Hidden delete form -->
<form
	bind:this={deleteFormEl}
	method="POST"
	action="?/deletePost"
	class="hidden-form"
	use:enhance={() => {
		deleteError = null;
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				const msg = (result.data as { message?: string })?.message ?? 'Delete failed';
				deleteError = msg;
				toast.error(msg);
			} else {
				toast.success('Story deleted');
				await invalidateAll();
			}
			await update({ reset: false });
		};
	}}
>
	<input type="hidden" name="postId" value={deleteTarget?.id ?? ''} />
</form>

<ConfirmModal
	open={deleteTarget !== null}
	title="Delete this story?"
	message={deleteTarget
		? `"${deleteTarget.title}" will be deleted for good. This cannot be undone.`
		: ''}
	confirmLabel="Delete story"
	danger
	onConfirm={() => {
		deleteFormEl.requestSubmit();
		deleteTarget = null;
	}}
	onCancel={() => (deleteTarget = null)}
/>

<style>
	.hidden-form {
		display: none;
	}

	.posts-page {
		display: flex;
		flex-direction: column;
	}

	/* Filters: one calm row that wraps */
	.filters {
		margin-bottom: 1.25rem;
	}

	.field {
		min-width: 0;
	}

	.field-search {
		flex: 1 1 14rem;
	}

	.control {
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

	select.control {
		cursor: pointer;
	}

	.control::placeholder {
		color: var(--color-admin-text-muted);
		opacity: 0.8;
	}

	.control:hover {
		border-color: var(--color-admin-text-muted);
	}

	.control:focus-visible {
		outline: 2px solid var(--color-admin-accent);
		outline-offset: 1px;
		border-color: var(--color-admin-accent);
	}

	.clear {
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.banner {
		margin-bottom: 1rem;
		padding: 0.75rem 1rem;
		background: color-mix(in srgb, var(--color-status-error) 12%, transparent);
		border: 1px solid var(--color-status-error);
		border-radius: 8px;
		color: var(--color-status-error);
		font-size: var(--text-sm);
		font-weight: 500;
	}

	/* The bulk TL;DR writer */
	.bulk-strip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
		padding: 0.875rem 1rem;
		background: var(--color-admin-surface);
		border: 1px solid var(--color-admin-border);
		border-left: 4px solid var(--color-admin-accent);
		border-radius: 8px;
		font-size: var(--text-sm);
		color: var(--color-admin-text);
	}

	.bulk-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 0;
		min-width: 0;
		flex: 1;
	}

	.bulk-latest {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		overflow-wrap: anywhere;
	}

	.bulk-progress {
		width: 100%;
		max-width: 28rem;
		height: 6px;
		margin-top: 0.25rem;
		appearance: none;
		border: 0;
		border-radius: 3px;
		background: var(--color-admin-border);
		overflow: hidden;
	}

	.bulk-progress::-webkit-progress-bar {
		background: var(--color-admin-border);
	}

	.bulk-progress::-webkit-progress-value {
		background: var(--color-admin-accent);
	}

	.bulk-progress::-moz-progress-bar {
		background: var(--color-admin-accent);
	}

	/* The list */
	.story {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		min-width: 0;
	}

	.thumb {
		flex-shrink: 0;
		width: 56px;
		height: 56px;
		object-fit: cover;
		border-radius: 6px;
		display: block;
	}

	.thumb-placeholder {
		background: var(--color-admin-surface-hover);
		border: 1px solid var(--color-admin-border);
	}

	.story-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.cell-story {
		max-width: 28rem;
	}

	.post-title {
		font-family: var(--serif);
		font-size: 1.125rem;
		font-weight: 500;
		line-height: 1.3;
		letter-spacing: -0.005em;
		color: var(--color-admin-text);
	}

	.post-subtitle {
		font-size: var(--text-xs);
		line-height: 1.4;
		color: var(--color-admin-text-muted);
	}

	.post-author {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}

	.category {
		font-size: var(--text-sm);
		color: var(--color-admin-text);
		white-space: nowrap;
	}

	.cell-date {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.cell-tldr,
	.cell-featured {
		text-align: center;
	}

	.tldr-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		min-width: 32px;
		min-height: 32px;
	}

	.tldr-yes {
		color: var(--color-status-published);
	}

	.tldr-no {
		color: var(--color-admin-text-muted);
	}

	/* Hidden on desktop, shown beside the icon on small screens */
	.tldr-text {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.125rem;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: none;
		border: none;
		border-radius: 8px;
		color: var(--color-admin-text-muted);
		text-decoration: none;
		cursor: pointer;
		transition:
			color 0.15s,
			background-color 0.15s;
	}

	.icon-btn:hover {
		color: var(--color-admin-text);
		background: var(--color-admin-surface-hover);
	}

	.icon-delete:hover {
		color: var(--color-status-error);
		background: color-mix(in srgb, var(--color-status-error) 12%, transparent);
	}

	.featured-toggle:hover {
		color: var(--color-admin-accent);
	}

	.featured-toggle.active {
		color: var(--color-admin-accent);
	}

	.date-prefix {
		display: none;
	}

	.pagination-wrap {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.count-label {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 1023px) {
		.control {
			min-height: 44px;
		}

		.icon-btn {
			width: 44px;
			height: 44px;
		}

		.field {
			flex: 1 1 10rem;
		}

		/* The real table becomes a stack of rows: story first, then its facts */
		.list :global(thead) {
			display: none;
		}

		.list :global(table),
		.list :global(tbody) {
			display: block;
		}

		.list :global(.table-wrap) {
			overflow-x: visible;
		}

		.list :global(tr.row) {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem 0.875rem;
			padding: 1rem 0;
		}

		.list :global(tr.row > td) {
			display: block;
			padding: 0;
		}

		.cell-story {
			flex: 0 0 100%;
			max-width: none;
		}

		.story-text {
			flex: 1;
		}

		.cell-status {
			order: 1;
		}

		.cell-category {
			order: 2;
		}

		.cell-date {
			order: 3;
		}

		.cell-date .date-prefix {
			display: inline;
			margin-right: 0.25em;
		}

		.cell-tldr {
			order: 4;
			text-align: left;
		}

		/* Forces the actions onto their own line, under the facts */
		.list :global(tr.row)::after {
			content: '';
			order: 5;
			flex: 0 0 100%;
			height: 0;
		}

		.cell-actions {
			order: 6;
			margin-left: -0.625rem;
		}

		.cell-featured {
			order: 7;
			margin-left: auto;
			margin-right: -0.625rem;
		}

		.tldr-text {
			position: static;
			width: auto;
			height: auto;
			margin: 0;
			overflow: visible;
			clip: auto;
			font-size: var(--text-xs);
			white-space: normal;
		}

		.bulk-strip {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
