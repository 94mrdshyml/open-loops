<script lang="ts">
	import { onMount } from 'svelte';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import StatCard from '$lib/components/admin/StatCard.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import { isOverdue } from '$lib/utils/schedule';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	onMount(() => pageTitle.set('Dashboard'));

	const isAdmin = $derived(data.user.role === 'admin');
	const firstName = $derived(data.user.firstName ?? data.user.name.split(' ')[0]);

	function fmtNum(n: number): string {
		return n.toLocaleString('en-GB');
	}

	function fmtDate(d: Date | null): string {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	}

	const todo = $derived(
		[
			isAdmin && data.pendingCommentCount > 0
				? {
						label: `${data.pendingCommentCount} ${data.pendingCommentCount === 1 ? 'comment is' : 'comments are'} waiting for approval`,
						href: '/dashboard/comments'
					}
				: null,
			data.stats.draftPosts > 0
				? {
						label: `${data.stats.draftPosts} ${data.stats.draftPosts === 1 ? 'draft' : 'drafts'} not yet published`,
						href: '/dashboard/posts?status=draft'
					}
				: null,
			isAdmin && data.missingTldr > 0
				? {
						label: `${data.missingTldr} published ${data.missingTldr === 1 ? 'story has' : 'stories have'} no TL;DR`,
						href: '/dashboard/posts?tldr=missing'
					}
				: null,
			isAdmin && !data.umamiShareUrl
				? {
						label: 'Add your Umami share link to see site traffic',
						href: '/dashboard/settings#integrations'
					}
				: null
		].filter((t): t is { label: string; href: string } => t !== null)
	);
</script>

<div class="home">
	<div class="welcome">
		<p class="hello">Hello, {firstName}.</p>
		<a href="/dashboard/posts/new" class="ad-btn">New story</a>
	</div>

	<section aria-label="Story counts" class="stories">
		<div class="numbers">
			<a href="/dashboard/posts?status=published" class="num-link">
				<StatCard label="Published" value={fmtNum(data.stats.publishedPosts)} />
			</a>
			<a href="/dashboard/posts?status=draft" class="num-link">
				<StatCard label="Drafts" value={fmtNum(data.stats.draftPosts)} />
			</a>
			<a href="/dashboard/posts?status=scheduled" class="num-link">
				<StatCard label="Scheduled" value={fmtNum(data.stats.scheduledPosts)} />
			</a>
		</div>
	</section>

	<div class="two-col">
		<section aria-labelledby="recent-heading">
			<SectionHeading label="Recent stories" id="recent-heading">
				{#snippet actions()}
					<a href="/dashboard/posts" class="ad-link small">All stories →</a>
				{/snippet}
			</SectionHeading>

			{#if data.stats.recentPosts.length > 0}
				<ul class="recent">
					{#each data.stats.recentPosts as post (post.id)}
						<li class="recent-row">
							<a href="/dashboard/posts/{post.id}/edit" class="recent-title">{post.title}</a>
							<span class="recent-meta">
								<StatusBadge
									status={post.status as 'draft' | 'published' | 'scheduled' | 'archived'}
									overdue={isOverdue(post.status, post.publishedAt)}
								/>
								<span class="ad-muted">{fmtDate(post.updatedAt)}</span>
							</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="empty">
					No stories yet. <a href="/dashboard/posts/new" class="ad-link">Write the first one</a>.
				</p>
			{/if}
		</section>

		<section aria-labelledby="todo-heading">
			<SectionHeading label="Needs you" id="todo-heading" />
			{#if todo.length > 0}
				<ul class="todo">
					{#each todo as item (item.href)}
						<li>
							<a href={item.href} class="todo-row">
								<span>{item.label}</span>
								<span class="arrow" aria-hidden="true">→</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="empty">Nothing is waiting for you.</p>
			{/if}
		</section>
	</div>

	{#if isAdmin && data.userStats}
		<section aria-labelledby="people-heading">
			<SectionHeading label="People and mail" id="people-heading" />
			<nav class="ad-tabs range" aria-label="Time range">
				{#each [7, 30, 90] as n (n)}
					<a href="?days={n}" class="ad-tab" aria-current={data.days === n ? 'page' : undefined}>
						Last {n} days
					</a>
				{/each}
			</nav>

			<div class="people">
				<StatCard label="Accounts" value={fmtNum(data.userStats.totalUsers)} />
				<StatCard label="New accounts" value={`+${fmtNum(data.userStats.newUsers)}`} />
				<StatCard label="Subscribers" value={fmtNum(data.userStats.totalSubscribers)} />
				<StatCard label="New subscribers" value={`+${fmtNum(data.userStats.newSubscribers)}`} />
				<StatCard label="Emails sent" value={fmtNum(data.emailStats?.totalSent ?? 0)} />
				<StatCard label="Delivered" value={fmtNum(data.emailStats?.deliveredCount ?? 0)} />
			</div>
		</section>
	{/if}
</div>

<style>
	.home {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.welcome {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.hello {
		font-family: var(--serif);
		font-style: italic;
		font-size: 1.375rem;
		color: var(--color-admin-text-muted);
		margin: 0;
	}

	.numbers {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.num-link {
		display: block;
		text-decoration: none;
		color: inherit;
		border-radius: 4px;
	}

	.num-link:hover :global(.stat-value) {
		color: var(--color-admin-accent);
	}

	.two-col {
		display: grid;
		grid-template-columns: 3fr 2fr;
		gap: 2.5rem;
		align-items: start;
	}

	.small {
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.recent,
	.todo {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.recent-row {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.875rem 0;
		border-bottom: 1px solid var(--color-admin-border);
	}

	.recent-row:first-child {
		padding-top: 0;
	}

	.recent-title {
		font-family: var(--serif);
		font-size: 1.1875rem;
		font-weight: 500;
		line-height: 1.3;
		letter-spacing: -0.005em;
		color: var(--color-admin-text);
		text-decoration: none;
	}

	.recent-title:hover {
		color: var(--color-admin-accent);
	}

	.recent-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: var(--text-xs);
	}

	.todo-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 52px;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-admin-border);
		color: var(--color-admin-text);
		text-decoration: none;
		font-size: var(--text-sm);
		font-weight: 500;
	}

	.todo-row:hover {
		color: var(--color-admin-accent);
	}

	.arrow {
		flex-shrink: 0;
	}

	.empty {
		margin: 0;
		padding: 1rem 0;
		font-size: var(--text-sm);
		color: var(--color-admin-text-muted);
	}

	.range {
		margin-bottom: 1.5rem;
	}

	.people {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 1.5rem;
	}

	@media (max-width: 1023px) {
		.two-col {
			grid-template-columns: 1fr;
		}

		.people {
			grid-template-columns: repeat(3, 1fr);
			row-gap: 1.75rem;
		}
	}

	@media (max-width: 599px) {
		.numbers {
			gap: 1rem;
		}

		.people {
			grid-template-columns: repeat(2, 1fr);
		}

		.welcome {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
