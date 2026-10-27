<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { replaceState } from '$app/navigation';
	import { formatDate } from '$lib/utils/format-date';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let isSubscribed = $derived(data.user.isNewsletterSubscriber);

	const user = $derived(data.user);
	const readHistory = $derived(data.readHistory);
	const userComments = $derived(data.userComments);
	let savedPosts = $state(data.savedPosts);

	let showWelcome = $state(page.url.searchParams.get('welcome') === '1');
	const isNewSubscriber = $derived(page.url.searchParams.get('subscribed') === '1');
	let dismissingOut = $state(false);

	function dismissWelcome() {
		dismissingOut = true;
		setTimeout(() => {
			showWelcome = false;
			const newUrl = new URL(page.url);
			newUrl.searchParams.delete('welcome');
			newUrl.searchParams.delete('subscribed');
			replaceState(newUrl.toString(), {});
		}, 300);
	}

	const displayName = $derived(
		user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name
	);

	const initials = $derived(
		displayName
			.split(' ')
			.slice(0, 2)
			.map((w: string) => w[0])
			.join('')
			.toUpperCase()
	);

	let signingOut = $state(false);
	let togglingNewsletter = $state(false);
	let activeTab = $state<'history' | 'comments' | 'saved'>('history');

	function commentStatusLabel(status: string): string {
		if (status === 'approved') return 'Published';
		if (status === 'rejected') return 'Not approved';
		return 'Awaiting moderation';
	}

	function commentStatusClass(status: string): string {
		if (status === 'approved') return 'status-approved';
		if (status === 'rejected') return 'status-rejected';
		return 'status-pending';
	}

	function truncate(text: string, max = 100): string {
		return text.length <= max ? text : text.slice(0, max) + '…';
	}
</script>

<svelte:head>
	<title>My Profile — Open Tabs</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="profile-shell">
	{#if showWelcome}
		<div class="welcome-banner" class:fade-out={dismissingOut} role="alert">
			<span>
				Welcome to Open Tabs, {user.firstName ?? user.name}. Your account has been created.
				{#if isNewSubscriber}You're now subscribed to the Open Tabs newsletter.{/if}
			</span>
			<button onclick={dismissWelcome} class="dismiss-btn" aria-label="Dismiss">
				<svg
					width="14"
					height="14"
					viewBox="0 0 14 14"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					aria-hidden="true"
				>
					<line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
				</svg>
			</button>
		</div>
	{/if}

	<!-- Who you are -->
	<header class="profile-head">
		<div class="avatar-circle">
			{#if user.avatarUrl}
				<img src={user.avatarUrl} alt={displayName} class="avatar-img" />
			{:else}
				<span class="avatar-initials">{initials}</span>
			{/if}
		</div>

		<div class="user-info">
			<div class="meta">
				<span class="kicker">My profile</span>
				{#if user.username}<span aria-hidden="true">·</span><span>@{user.username}</span>{/if}
			</div>
			<h1 class="user-name">{displayName}</h1>
			<p class="user-line">{user.email} · Member since {formatDate(user.createdAt)}</p>
		</div>
	</header>

	<!-- What you can do -->
	<div class="actions">
		<a href="/profile/edit" class="btn">Edit profile</a>

		<form
			method="POST"
			action="?/toggleNewsletter"
			class="newsletter-form"
			use:enhance={() => {
				togglingNewsletter = true;
				return async ({ update }) => {
					togglingNewsletter = false;
					await update();
				};
			}}
		>
			<span class="newsletter-state" class:subscribed={isSubscribed}>
				Newsletter: {isSubscribed ? 'subscribed' : 'not subscribed'}
			</span>
			<button type="submit" class="btn" disabled={togglingNewsletter}>
				{#if togglingNewsletter}
					Working…
				{:else if isSubscribed}
					Unsubscribe
				{:else}
					Subscribe
				{/if}
			</button>
		</form>

		<form
			method="POST"
			action="/api/sign-out"
			class="signout-form"
			use:enhance={() => {
				signingOut = true;
				return async () => {
					window.location.href = '/';
				};
			}}
		>
			<input type="hidden" name="redirectTo" value="/" />
			<button type="submit" class="btn btn-quiet" disabled={signingOut}>
				{signingOut ? 'Signing out…' : 'Sign out'}
			</button>
		</form>
	</div>

	<!-- Activity: one open tab at a time -->
	<section class="activity-panel" aria-label="Your activity">
		<div class="tab-bar" role="tablist" aria-label="Your activity">
			<button
				class="tab"
				role="tab"
				aria-selected={activeTab === 'history'}
				onclick={() => (activeTab = 'history')}
			>
				Reading history
			</button>
			<button
				class="tab"
				role="tab"
				aria-selected={activeTab === 'comments'}
				onclick={() => (activeTab = 'comments')}
			>
				Comments
				{#if userComments.length > 0}
					<span class="tab-count">{userComments.length}</span>
				{/if}
			</button>
			<button
				class="tab"
				role="tab"
				aria-selected={activeTab === 'saved'}
				onclick={() => (activeTab = 'saved')}
			>
				Saved
				{#if savedPosts.length > 0}
					<span class="tab-count">{savedPosts.length}</span>
				{/if}
			</button>
		</div>

		<div role="tabpanel">
			{#if activeTab === 'history'}
				{#if readHistory.length === 0}
					<div class="empty-state">
						<p>You haven't read any posts yet.</p>
						<a href="/" class="empty-link">Start reading</a>
					</div>
				{:else}
					{#each readHistory as item (item.postSlug)}
						<a href="/posts/{item.postSlug}" class="row">
							{#if item.coverImageUrl}
								<img
									src={item.coverImageUrl}
									alt=""
									class="thumb"
									width="96"
									height="54"
									loading="lazy"
								/>
							{:else}
								<span class="thumb thumb-placeholder" aria-hidden="true"></span>
							{/if}
							<span class="row-text">
								<span class="row-title">{item.postTitle}</span>
								<span class="row-meta">Read on {formatDate(item.readAt)}</span>
							</span>
						</a>
					{/each}
				{/if}
			{:else if activeTab === 'comments'}
				{#if userComments.length === 0}
					<div class="empty-state">
						<p>You haven't commented on any posts yet.</p>
						<a href="/" class="empty-link">Start reading</a>
					</div>
				{:else}
					{#each userComments as comment (comment.id)}
						<div class="comment-row">
							<div class="comment-header">
								<a href="/posts/{comment.postSlug}" class="row-title comment-post-title">
									{comment.postTitle ?? comment.postSlug}
								</a>
								<span class="comment-status {commentStatusClass(comment.status)}">
									{commentStatusLabel(comment.status)}
								</span>
							</div>
							<p class="comment-body">{truncate(comment.body)}</p>
							<span class="row-meta">{formatDate(comment.createdAt)}</span>
						</div>
					{/each}
				{/if}
			{:else if activeTab === 'saved'}
				{#if savedPosts.length === 0}
					<div class="empty-state">
						<p>No saved articles yet.</p>
						<a href="/" class="empty-link">Start reading</a>
					</div>
				{:else}
					{#each savedPosts as item (item.postSlug)}
						<div class="row saved-row">
							<a href="/posts/{item.postSlug}" class="thumb-link" tabindex="-1" aria-hidden="true">
								{#if item.coverImageUrl}
									<img
										src={item.coverImageUrl}
										alt=""
										class="thumb"
										width="96"
										height="54"
										loading="lazy"
									/>
								{:else}
									<span class="thumb thumb-placeholder"></span>
								{/if}
							</a>
							<span class="row-text">
								<a href="/posts/{item.postSlug}" class="row-title">{item.postTitle}</a>
								<span class="row-meta">Saved {formatDate(item.savedAt)}</span>
							</span>
							<form
								method="POST"
								action="?/unsavePost"
								use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'success') {
											savedPosts = savedPosts.filter((p) => p.postSlug !== item.postSlug);
										}
									};
								}}
							>
								<input type="hidden" name="postSlug" value={item.postSlug} />
								<button
									type="submit"
									class="unsave-btn"
									aria-label="Remove bookmark"
									title="Remove bookmark"
								>
									<svg
										width="14"
										height="14"
										viewBox="0 0 14 14"
										fill="none"
										stroke="currentColor"
										stroke-width="1.6"
										aria-hidden="true"
									>
										<line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
									</svg>
								</button>
							</form>
						</div>
					{/each}
				{/if}
			{/if}
		</div>
	</section>
</div>

<style>
	.profile-shell {
		width: min(var(--max-w), 100% - 80px);
		margin: 0 auto;
		padding-top: 40px;
	}

	/* ── Welcome banner ── */
	.welcome-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		background: var(--ink);
		color: var(--cream);
		padding: 4px 4px 4px 20px;
		border-radius: 10px;
		margin-bottom: 8px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1.4;
		opacity: 1;
		transition: opacity 0.3s;
	}

	.welcome-banner.fade-out {
		opacity: 0;
	}

	.dismiss-btn {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--cream);
		cursor: pointer;
		border-radius: 8px;
	}

	.dismiss-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	/* ── Header ── */
	.profile-head {
		display: flex;
		gap: 28px;
		align-items: center;
		padding: 24px 0 28px;
	}

	.avatar-circle {
		width: 96px;
		height: 96px;
		border-radius: 50%;
		background: var(--paper2);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initials {
		font-family: var(--serif);
		font-style: italic;
		font-size: 36px;
		line-height: 1;
		color: var(--ink);
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1;
		color: var(--ink-60);
	}

	.kicker {
		color: var(--accent);
		font-weight: 600;
	}

	.user-name {
		margin: 0;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 48px;
		line-height: 1.05;
		letter-spacing: -0.022em;
		color: var(--ink);
		overflow-wrap: anywhere;
	}

	.user-line {
		margin: 0;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		color: var(--ink-60);
		overflow-wrap: anywhere;
	}

	/* ── Actions ── */
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 16px;
		padding: 16px 0;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
	}

	.newsletter-form {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.signout-form {
		margin-left: auto;
	}

	.newsletter-state {
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		color: var(--ink-60);
	}

	.newsletter-state.subscribed {
		color: var(--ink);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0 18px;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		color: var(--ink);
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 10px;
		text-decoration: none;
		cursor: pointer;
		transition: background-color 120ms ease;
	}

	.btn:hover:not(:disabled) {
		background: var(--ink-10);
	}

	.btn:active:not(:disabled) {
		background: var(--border);
	}

	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.btn-quiet {
		border-color: transparent;
		color: var(--ink-60);
	}

	/* ── Tabs: the open one joins the list below it ── */
	.activity-panel {
		margin-top: 56px;
	}

	.tab-bar {
		display: flex;
		align-items: flex-end;
		overflow-x: auto;
		scrollbar-width: none;
		background: linear-gradient(var(--ink), var(--ink)) bottom / 100% 2px no-repeat;
	}

	.tab-bar::-webkit-scrollbar {
		display: none;
	}

	.tab {
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 16px;
		background: transparent;
		border: 0;
		border-radius: 8px 8px 0 0;
		font-family: var(--ui);
		font-weight: 500;
		font-size: 15px;
		line-height: 1;
		color: var(--ink-60);
		cursor: pointer;
		transition: color 120ms ease;
	}

	.tab:hover {
		color: var(--ink);
	}

	.tab:focus-visible {
		outline-offset: -4px;
	}

	.tab[aria-selected='true'] {
		background: var(--ink);
		color: var(--cream);
		font-weight: 600;
	}

	.tab-count {
		font-family: var(--ui);
		font-weight: 600;
		font-size: 13px;
		line-height: 1;
		padding: 3px 7px;
		border-radius: 6px;
		background: var(--ink-10);
	}

	.tab[aria-selected='true'] .tab-count {
		background: rgba(255, 255, 255, 0.16);
	}

	/* ── Rows ── */
	.row {
		display: grid;
		grid-template-columns: 96px minmax(0, 1fr);
		gap: 20px;
		align-items: center;
		padding: 18px 0;
		border-bottom: 1px solid var(--border);
		text-decoration: none;
		color: inherit;
	}

	.saved-row {
		grid-template-columns: 96px minmax(0, 1fr) auto;
	}

	.thumb-link {
		display: block;
	}

	.thumb {
		display: block;
		width: 96px;
		aspect-ratio: 16 / 9;
		height: auto;
		object-fit: cover;
		background: var(--paper2);
	}

	.row-text {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.row-title {
		font-family: var(--serif);
		font-weight: 500;
		font-size: 21px;
		line-height: 1.22;
		color: var(--ink);
		text-decoration: none;
		text-wrap: pretty;
	}

	a.row:hover .row-title,
	a.row-title:hover {
		color: var(--accent);
	}

	.row-meta {
		font-family: var(--ui);
		font-weight: 500;
		font-size: 14px;
		color: var(--ink-60);
	}

	.unsave-btn {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: 1px solid transparent;
		border-radius: 10px;
		color: var(--ink-60);
		cursor: pointer;
	}

	.unsave-btn:hover {
		color: var(--ink);
		border-color: var(--border);
	}

	.comment-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 20px 0;
		border-bottom: 1px solid var(--border);
	}

	.comment-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.comment-status {
		font-family: var(--ui);
		font-weight: 600;
		font-size: 13px;
		white-space: nowrap;
	}

	.status-approved {
		color: var(--ink);
	}

	.status-pending {
		color: var(--ink-60);
	}

	.status-rejected {
		color: var(--accent);
	}

	.comment-body {
		margin: 0;
		font-family: var(--serif);
		font-size: 17px;
		line-height: 1.55;
		color: var(--ink-60);
	}

	.empty-state {
		padding: 32px 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
	}

	.empty-state p {
		margin: 0;
		font-family: var(--serif);
		font-style: italic;
		font-size: 19px;
		color: var(--ink-60);
	}

	.empty-link {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-family: var(--ui);
		font-weight: 600;
		font-size: 15px;
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 4px;
	}

	.empty-link:hover {
		color: var(--accent);
	}

	@media (max-width: 1023px) {
		.user-name {
			font-size: 40px;
		}
	}

	@media (max-width: 639px) {
		.profile-shell {
			width: calc(100% - 40px);
			padding-top: 24px;
		}

		.profile-head {
			flex-direction: column;
			align-items: flex-start;
			gap: 18px;
			padding: 16px 0 24px;
		}

		.avatar-circle {
			width: 72px;
			height: 72px;
		}

		.avatar-initials {
			font-size: 28px;
		}

		.user-name {
			font-size: 34px;
		}

		.user-line {
			font-size: 14px;
		}

		.newsletter-form {
			width: 100%;
			justify-content: space-between;
		}

		.signout-form {
			margin-left: 0;
		}

		.activity-panel {
			margin-top: 40px;
		}

		.row {
			grid-template-columns: 72px minmax(0, 1fr);
			gap: 14px;
		}

		.saved-row {
			grid-template-columns: 72px minmax(0, 1fr) auto;
		}

		.thumb {
			width: 72px;
		}

		.row-title {
			font-size: 18px;
		}

		.row-meta {
			font-size: 13px;
		}
	}
</style>
