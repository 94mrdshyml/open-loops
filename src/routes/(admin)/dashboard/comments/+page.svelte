<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { invalidateAll } from '$app/navigation';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import Pagination from '$lib/components/admin/Pagination.svelte';
	import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	onMount(() => pageTitle.set('Comments'));

	const statusOptions = [
		{ value: 'pending', label: 'Pending' },
		{ value: 'approved', label: 'Approved' },
		{ value: 'rejected', label: 'Rejected' },
		{ value: '', label: 'All' }
	];

	const STATUS_LABELS: Record<string, string> = {
		pending: 'Pending',
		approved: 'Approved',
		rejected: 'Rejected'
	};

	function tabHref(status: string, withSearch = true): string {
		const parts: string[] = [];
		if (status) parts.push(`status=${encodeURIComponent(status)}`);
		if (withSearch && data.filters.search) {
			parts.push(`search=${encodeURIComponent(data.filters.search)}`);
		}
		return parts.length ? `?${parts.join('&')}` : '?';
	}

	function authorOf(c: { userUsername: string | null; userName: string }): string {
		return c.userName || (c.userUsername ? `@${c.userUsername}` : 'Unknown');
	}

	function formatWhen(d: Date | string): string {
		return new Date(d).toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	interface DeleteTarget {
		id: string;
		author: string;
		story: string;
	}
	let deleteTarget = $state<DeleteTarget | null>(null);
	let deleteFormEl: HTMLFormElement;
	let busyId = $state<string | null>(null);

	const emptyMessage = $derived(
		data.filters.search
			? 'No comments match'
			: data.filters.status === 'pending'
				? 'Nothing to review'
				: 'No comments here'
	);

	const emptySublabel = $derived(
		data.filters.search
			? 'Try a different search, or clear it to see every comment.'
			: data.filters.status === 'pending'
				? 'New comments will wait here until you approve or reject them.'
				: 'Comments with this status will appear here.'
	);

	function submitter(id: string | null, done: string, failed: string): SubmitFunction {
		return () => {
			busyId = id;
			return async ({ result, update }) => {
				if (result.type === 'failure' || result.type === 'error') {
					toast.error(failed);
				} else {
					toast.success(done);
				}
				busyId = null;
				await update({ reset: false });
				await invalidateAll();
			};
		};
	}
</script>

<div class="comments-page">
	<nav class="ad-tabs" aria-label="Comment status">
		{#each statusOptions as opt (opt.value)}
			<a
				href={tabHref(opt.value)}
				class="ad-tab"
				aria-current={data.filters.status === (opt.value || null) ? 'page' : undefined}
			>
				{opt.label}
			</a>
		{/each}
	</nav>

	<p class="count" aria-live="polite">
		{data.totalCount}
		{data.totalCount === 1 ? 'comment' : 'comments'}
	</p>

	<form method="GET" class="ad-toolbar search" role="search" aria-label="Search comments">
		{#if data.filters.status}
			<input type="hidden" name="status" value={data.filters.status} />
		{/if}
		<label for="c-search" class="sr-only">Search comments</label>
		<input
			id="c-search"
			type="search"
			name="search"
			value={data.filters.search ?? ''}
			placeholder="Search the text of comments"
			class="control"
		/>
		<button type="submit" class="ad-btn ad-btn--quiet">Search</button>
		{#if data.filters.search}
			<a href={tabHref(data.filters.status ?? '', false)} class="ad-link clear"> Clear search </a>
		{/if}
	</form>

	{#if data.comments.length === 0}
		<EmptyState
			message={emptyMessage}
			sublabel={emptySublabel}
			action={data.filters.search
				? {
						label: 'Clear search',
						href: tabHref(data.filters.status ?? '', false)
					}
				: undefined}
		/>
	{:else}
		<ul class="comments">
			{#each data.comments as comment (comment.id)}
				{@const author = authorOf(comment)}
				{@const story = comment.postTitle ?? comment.postSlug}
				<li class="comment" class:pending={comment.status === 'pending'}>
					<div class="comment-head">
						<p class="who">
							<span class="author">{author}</span>
							{#if comment.userUsername}
								<span class="ad-muted username">@{comment.userUsername}</span>
							{/if}
							<time class="ad-muted when" datetime={new Date(comment.createdAt).toISOString()}>
								{formatWhen(comment.createdAt)}
							</time>
						</p>
						<span class="badge badge-{comment.status}">
							{STATUS_LABELS[comment.status] ?? comment.status}
						</span>
					</div>

					<p class="on">
						<span class="ad-muted">On</span>
						<a
							href="/posts/{comment.postSlug}"
							target="_blank"
							rel="noopener noreferrer"
							class="story"
						>
							{story}<span class="sr-only"> (opens in a new tab)</span>
						</a>
					</p>

					<p class="body">{comment.body}</p>

					<div class="actions">
						{#if comment.status !== 'approved'}
							<form
								method="POST"
								action="?/approve"
								use:enhance={submitter(
									comment.id,
									'Comment approved',
									'Could not approve the comment. Try again.'
								)}
							>
								<input type="hidden" name="id" value={comment.id} />
								<button
									type="submit"
									class="ad-btn ad-btn--sm"
									class:ad-btn--quiet={comment.status !== 'pending'}
									disabled={busyId === comment.id}
									aria-label="Approve comment by {author}"
								>
									Approve
								</button>
							</form>
						{/if}

						{#if comment.status !== 'rejected'}
							<form
								method="POST"
								action="?/reject"
								use:enhance={submitter(
									comment.id,
									'Comment rejected',
									'Could not reject the comment. Try again.'
								)}
							>
								<input type="hidden" name="id" value={comment.id} />
								<button
									type="submit"
									class="ad-btn ad-btn--sm ad-btn--quiet"
									disabled={busyId === comment.id}
									aria-label="Reject comment by {author}"
								>
									Reject
								</button>
							</form>
						{/if}

						<button
							type="button"
							class="ad-btn ad-btn--sm ad-btn--danger delete"
							disabled={busyId === comment.id}
							aria-label="Delete comment by {author}"
							onclick={() => (deleteTarget = { id: comment.id, author, story })}
						>
							Delete
						</button>
					</div>
				</li>
			{/each}
		</ul>

		<Pagination
			currentPage={data.page}
			totalPages={data.totalPages}
			baseUrl="/dashboard/comments"
		/>
	{/if}
</div>

<form
	bind:this={deleteFormEl}
	method="POST"
	action="?/delete"
	class="hidden-form"
	use:enhance={submitter(null, 'Comment deleted', 'Could not delete the comment. Try again.')}
>
	<input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
</form>

<ConfirmModal
	open={deleteTarget !== null}
	title="Delete this comment?"
	message={deleteTarget
		? `The comment by ${deleteTarget.author} on "${deleteTarget.story}" will be deleted for good. This cannot be undone.`
		: ''}
	confirmLabel="Delete comment"
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

	.comments-page {
		display: flex;
		flex-direction: column;
	}

	.count {
		margin: 1rem 0 0.5rem;
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.search {
		margin: 0 0 1.25rem;
	}

	.control {
		flex: 1 1 14rem;
		min-width: 0;
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

	/* One comment: who, where, when, what they said, then what to do */
	.comments {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 2px solid var(--color-admin-text);
	}

	.comment {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 1.125rem 0 1.125rem 1rem;
		border-bottom: 1px solid var(--color-admin-border);
		border-left: 4px solid transparent;
	}

	/* Pending comments are the inbox, so they carry the accent */
	.comment.pending {
		border-left-color: var(--color-admin-accent);
	}

	.comment-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.who {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.25rem 0.625rem;
		margin: 0;
		min-width: 0;
	}

	.author {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--color-admin-text);
		overflow-wrap: anywhere;
	}

	.username {
		font-size: var(--text-xs);
	}

	.on {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.25rem 0.5rem;
		margin: 0;
		font-size: var(--text-sm);
	}

	.story {
		font-family: var(--serif);
		font-size: 1.0625rem;
		font-weight: 500;
		line-height: 1.3;
		color: var(--color-admin-text);
		text-decoration: underline;
		text-decoration-color: var(--color-admin-border-strong);
		text-underline-offset: 3px;
		overflow-wrap: anywhere;
	}

	.story:hover {
		color: var(--color-admin-accent);
		text-decoration-color: var(--color-admin-accent);
	}

	.when {
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
	}

	.body {
		max-width: 70ch;
		margin: 0.25rem 0 0.5rem;
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-admin-text);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.delete {
		margin-left: auto;
	}

	/* Comment status: a shape and a word as well as a colour */
	.badge {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.4em;
		padding: 0.2em 0.65em 0.2em 0.55em;
		border-radius: 999px;
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
	}

	.badge::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
	}

	.badge-pending {
		color: var(--color-status-scheduled);
		background: var(--color-status-scheduled-bg);
	}

	.badge-pending::before {
		border-radius: 1px;
		transform: rotate(45deg);
	}

	.badge-approved {
		color: var(--color-status-published);
		background: var(--color-status-published-bg);
	}

	.badge-rejected {
		color: var(--color-status-archived);
		background: var(--color-status-archived-bg);
	}

	.badge-rejected::before {
		background: transparent;
		box-shadow: inset 0 0 0 1.5px currentColor;
	}

	@media (max-width: 1023px) {
		.control {
			min-height: 44px;
		}

		.comment {
			padding-left: 0.75rem;
		}

		.actions :global(form),
		.actions > :global(button) {
			flex: 1 1 6rem;
		}

		.actions :global(.ad-btn) {
			width: 100%;
		}

		.delete {
			margin-left: 0;
		}
	}
</style>
