<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import DarkToggle from '$lib/components/blog/DarkToggle.svelte';
	import Toast from '$lib/components/admin/Toast.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	let signingOut = $state(false);
	let mobileDrawerOpen = $state(false);
	let avatarFailed = $state(false);

	const ICON_DASHBOARD = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`;
	const ICON_POSTS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
	const ICON_COMMENTS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
	const ICON_CATEGORIES = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`;
	const ICON_TAGS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
	const ICON_AUTHORS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`;
	const ICON_USERS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
	const ICON_SETTINGS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`;
	const ICON_NEWSLETTER = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
	const ICON_EMAILS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013 12.5a19.79 19.79 0 01-3.07-8.67A2 2 0 011.92 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`;
	const ICON_ACCOUNT = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
	const ICON_ANALYTICS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;

	interface NavItem {
		href: string;
		label: string;
		icon: string;
		exact?: boolean;
		adminOnly?: boolean;
		/** Opens in a new tab (Umami lives outside the site). */
		external?: boolean;
	}

	interface NavGroup {
		label: string | null;
		items: NavItem[];
	}

	const userRole = $derived(data.user?.role ?? 'author');

	// Analytics lives in Umami now. The link shows once a share URL is saved in Settings;
	// until then admins get a pointer to Settings and authors see nothing.
	const analyticsItem = $derived<NavItem | null>(
		data.umamiShareUrl
			? { href: data.umamiShareUrl, label: 'Analytics', icon: ICON_ANALYTICS, external: true }
			: userRole === 'admin'
				? {
						href: '/dashboard/settings#integrations',
						label: 'Add analytics link',
						icon: ICON_ANALYTICS
					}
				: null
	);

	const groups = $derived<NavGroup[]>([
		{
			label: null,
			items: [{ href: '/dashboard', label: 'Dashboard', exact: true, icon: ICON_DASHBOARD }]
		},
		{
			label: 'Write',
			items: [
				{ href: '/dashboard/posts', label: 'Posts', icon: ICON_POSTS },
				{ href: '/dashboard/comments', label: 'Comments', icon: ICON_COMMENTS, adminOnly: true }
			]
		},
		{
			label: 'Organise',
			items: [
				{
					href: '/dashboard/categories',
					label: 'Categories',
					icon: ICON_CATEGORIES,
					adminOnly: true
				},
				{ href: '/dashboard/tags', label: 'Tags', icon: ICON_TAGS, adminOnly: true },
				{ href: '/dashboard/authors', label: 'Authors', icon: ICON_AUTHORS, adminOnly: true }
			]
		},
		{
			label: 'People and mail',
			items: [
				{ href: '/dashboard/users', label: 'Users', icon: ICON_USERS, adminOnly: true },
				{
					href: '/dashboard/newsletter',
					label: 'Newsletter',
					icon: ICON_NEWSLETTER,
					adminOnly: true
				},
				{ href: '/dashboard/emails', label: 'Emails', icon: ICON_EMAILS, adminOnly: true }
			]
		},
		{
			label: 'Site',
			items: [
				...(analyticsItem ? [analyticsItem] : []),
				{ href: '/dashboard/settings', label: 'Settings', icon: ICON_SETTINGS, adminOnly: true },
				{ href: '/dashboard/account', label: 'My account', icon: ICON_ACCOUNT }
			]
		}
	]);

	const visibleGroups = $derived(
		groups
			.map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || userRole === 'admin') }))
			.filter((g) => g.items.length > 0)
	);

	function isActive(item: NavItem): boolean {
		if (item.external || item.href.includes('#')) return false;
		if (item.exact) return page.url.pathname === item.href;
		return page.url.pathname === item.href || page.url.pathname.startsWith(item.href + '/');
	}

	function initials(name: string): string {
		return name
			.split(' ')
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase();
	}
</script>

<!-- Mobile top bar -->
<div class="mobile-topbar">
	<button
		class="hamburger"
		onclick={() => (mobileDrawerOpen = !mobileDrawerOpen)}
		aria-label="Toggle navigation"
		aria-expanded={mobileDrawerOpen}
	>
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<line x1="3" y1="6" x2="21" y2="6" />
			<line x1="3" y1="12" x2="21" y2="12" />
			<line x1="3" y1="18" x2="21" y2="18" />
		</svg>
	</button>
	<span class="mobile-wordmark">Open Tabs<span class="dot">.</span></span>
	<DarkToggle />
</div>

<!-- Mobile drawer backdrop -->
{#if mobileDrawerOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="drawer-backdrop" onclick={() => (mobileDrawerOpen = false)}></div>
{/if}

<div class="admin-shell">
	<aside class="sidebar" class:drawer-open={mobileDrawerOpen} aria-label="Dashboard navigation">
		<div class="sidebar-header">
			<a href="/dashboard" class="sidebar-wordmark">Open Tabs<span class="dot">.</span></a>
			<span class="sidebar-kicker">Dashboard</span>
		</div>

		<nav class="sidebar-nav">
			<!-- eslint-disable svelte/no-at-html-tags -->
			{#each visibleGroups as group (group.label ?? 'top')}
				<div class="nav-group">
					{#if group.label}
						<p class="nav-group-label">{group.label}</p>
					{/if}
					{#each group.items as item (item.href + item.label)}
						<a
							href={item.href}
							class="sidebar-item"
							class:active={isActive(item)}
							aria-current={isActive(item) ? 'page' : undefined}
							title={item.label}
							target={item.external ? '_blank' : undefined}
							rel={item.external ? 'noopener noreferrer' : undefined}
							onclick={() => (mobileDrawerOpen = false)}
						>
							<span class="nav-icon-wrap">
								{@html item.icon}
								{#if item.href === '/dashboard/comments' && data.pendingCommentCount > 0}
									<span class="pending-dot" aria-hidden="true"></span>
								{/if}
							</span>
							<span class="sidebar-label">{item.label}</span>
							{#if item.external}
								<span class="external-mark" aria-hidden="true">↗</span>
								<span class="sr-only">(opens in a new tab)</span>
							{/if}
							{#if item.href === '/dashboard/comments' && data.pendingCommentCount > 0}
								<span class="count-pill">
									{data.pendingCommentCount}<span class="sr-only"> waiting</span>
								</span>
							{/if}
						</a>
					{/each}
				</div>
			{/each}
			<!-- eslint-enable svelte/no-at-html-tags -->
		</nav>

		<div class="sidebar-footer">
			<a
				href="/"
				target="_blank"
				rel="noopener noreferrer"
				class="sidebar-item view-site"
				title="View site"
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.75"
					aria-hidden="true"
				>
					<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
					<polyline points="15 3 21 3 21 9" />
					<line x1="10" y1="14" x2="21" y2="3" />
				</svg>
				<span class="sidebar-label">View site</span>
				<span class="sr-only">(opens in a new tab)</span>
			</a>

			{#if data.user}
				<div class="sidebar-user">
					<div class="user-avatar" aria-hidden="true">
						{#if data.user.avatarUrl && !avatarFailed}
							<img
								src={data.user.avatarUrl}
								alt=""
								class="user-avatar-img"
								onerror={() => (avatarFailed = true)}
							/>
						{:else}
							{initials(data.user.name)}
						{/if}
					</div>
					<div class="user-info">
						<span class="user-name">{data.user.name}</span>
						<span class="user-role">{userRole}</span>
					</div>
					<form
						method="POST"
						action="/api/sign-out"
						use:enhance={() => {
							signingOut = true;
							return async () => {
								signingOut = false;
								await goto('/login');
							};
						}}
					>
						<button type="submit" class="sign-out-btn" disabled={signingOut} title="Sign out">
							<span class="sr-only">Sign out</span>
							{#if signingOut}
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									aria-hidden="true"
									class="spin"
								>
									<path
										d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
									/>
								</svg>
							{:else}
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									aria-hidden="true"
								>
									<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
									<polyline points="16 17 21 12 16 7" />
									<line x1="21" y1="12" x2="9" y2="12" />
								</svg>
							{/if}
						</button>
					</form>
				</div>
			{/if}
		</div>
	</aside>

	<Toast />

	<div class="admin-content">
		<header class="page-head">
			<h1 class="page-title">{$pageTitle}</h1>
			<div class="page-head-tools">
				<DarkToggle />
			</div>
		</header>
		<main class="content-body" id="main">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.dot {
		color: var(--color-admin-accent);
	}

	/* ── Mobile top bar ───────────────────────────────────── */
	.mobile-topbar {
		display: none;
		align-items: center;
		gap: 0.75rem;
		padding: 0 0.75rem;
		height: 60px;
		background: var(--color-admin-sidebar);
		border-bottom: 1px solid var(--color-admin-border);
		position: sticky;
		top: 0;
		z-index: 50;
		font-family: var(--font-sans);
	}

	.mobile-topbar :global(.toggle) {
		margin-left: auto;
	}

	.hamburger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: none;
		border: 1px solid var(--color-admin-border);
		border-radius: 10px;
		color: var(--color-admin-text);
		cursor: pointer;
	}

	.hamburger:hover {
		background: var(--color-admin-surface-hover);
	}

	.mobile-wordmark {
		font-family: var(--serif);
		font-size: 1.375rem;
		letter-spacing: -0.015em;
		color: var(--color-admin-text);
	}

	.drawer-backdrop {
		display: none;
		position: fixed;
		inset: 0;
		background: var(--color-admin-overlay);
		z-index: 40;
	}

	/* ── Shell ────────────────────────────────────────────── */
	.admin-shell {
		display: flex;
		min-height: 100dvh;
		background-color: var(--color-admin-bg);
		color: var(--color-admin-text);
		font-family: var(--font-sans);
	}

	/* The sidebar is paper; the open item is a tab that joins the page beside it. */
	.sidebar {
		display: flex;
		flex-direction: column;
		width: 248px;
		background-color: var(--color-admin-sidebar);
		border-right: 1px solid var(--color-admin-border);
		position: sticky;
		top: 0;
		height: 100dvh;
		flex-shrink: 0;
		overflow-y: auto;
	}

	.sidebar-header {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 1.25rem 1.25rem 1rem;
		flex-shrink: 0;
	}

	.sidebar-wordmark {
		font-family: var(--serif);
		font-size: 1.75rem;
		line-height: 1;
		letter-spacing: -0.015em;
		color: var(--color-admin-text);
		text-decoration: none;
		white-space: nowrap;
	}

	.sidebar-kicker {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: var(--tracking-caps);
		text-transform: uppercase;
		color: var(--color-admin-text-muted);
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		padding: 0.25rem 0 0.75rem 0.75rem;
		flex: 1;
	}

	.nav-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-group-label {
		margin: 0 0 4px 0.75rem;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: var(--tracking-caps);
		text-transform: uppercase;
		color: var(--color-admin-text-muted);
	}

	.sidebar-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 40px;
		padding: 0 0.75rem;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-admin-text-muted);
		text-decoration: none;
		white-space: nowrap;
		border: 1px solid transparent;
		border-right: 0;
		border-radius: 10px 0 0 10px;
		transition:
			color 0.15s,
			background-color 0.15s;
	}

	.sidebar-item:hover {
		color: var(--color-admin-text);
		background-color: var(--color-admin-surface-hover);
	}

	.sidebar-item.active {
		color: var(--color-admin-text);
		font-weight: 600;
		background-color: var(--color-admin-bg);
		border-color: var(--color-admin-border);
		/* Covers the sidebar rule so the tab and the page read as one sheet */
		margin-right: -1px;
		padding-right: calc(0.75rem + 1px);
	}

	.sidebar-item.active::after {
		content: '';
		position: absolute;
		left: 0;
		top: 10px;
		bottom: 10px;
		width: 3px;
		border-radius: 0 2px 2px 0;
		background: var(--color-admin-accent);
	}

	.nav-icon-wrap {
		position: relative;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.pending-dot {
		display: none;
	}

	.sidebar-label {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.external-mark {
		margin-left: auto;
		font-size: var(--text-sm);
		color: var(--color-admin-text-muted);
	}

	.count-pill {
		margin-left: auto;
		min-width: 22px;
		padding: 2px 7px;
		border-radius: 999px;
		background: var(--color-admin-accent);
		color: var(--color-admin-bg);
		font-size: 0.75rem;
		font-weight: 700;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.sidebar-footer {
		padding: 0.5rem 0.75rem 0.75rem;
		border-top: 1px solid var(--color-admin-border);
		flex-shrink: 0;
	}

	.view-site {
		border-radius: 10px;
		border-right: 1px solid transparent;
	}

	.sidebar-user {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.25rem 0 0.25rem;
		margin-top: 0.25rem;
	}

	.user-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--color-admin-text);
		color: var(--color-admin-bg);
		font-size: 0.75rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.user-avatar {
		overflow: hidden;
	}

	.user-avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.user-info {
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.user-name {
		display: block;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-admin-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.user-role {
		display: block;
		font-size: 0.75rem;
		color: var(--color-admin-text-muted);
		text-transform: capitalize;
	}

	.sign-out-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: none;
		border: none;
		color: var(--color-admin-text-muted);
		border-radius: 10px;
		cursor: pointer;
		flex-shrink: 0;
		transition: color 0.15s;
	}

	.sign-out-btn:hover:not(:disabled) {
		color: var(--color-admin-text);
		background: var(--color-admin-surface-hover);
	}

	.sign-out-btn:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	:global(.spin) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.spin) {
			animation: none;
		}
	}

	/* ── Content ──────────────────────────────────────────── */
	.admin-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.page-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin: 1.75rem 2rem 0;
		padding-bottom: 0.875rem;
		border-bottom: 2px solid var(--color-admin-text);
		max-width: 1240px;
	}

	.page-title {
		font-family: var(--serif);
		font-size: 2.25rem;
		font-weight: 500;
		line-height: 1.05;
		letter-spacing: -0.02em;
		color: var(--color-admin-text);
		margin: 0;
	}

	.page-head-tools {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.content-body {
		flex: 1;
		width: 100%;
		max-width: calc(1240px + 4rem);
		padding: 1.75rem 2rem 4rem;
	}

	/* Touch screens get 44px targets */
	@media (max-width: 1023px) {
		.sidebar-item {
			min-height: 44px;
		}
	}

	/* Smaller desktop: icons only */
	@media (max-width: 1279px) {
		.sidebar {
			width: 64px;
		}

		.sidebar-header,
		.nav-group-label,
		.sidebar-label,
		.external-mark,
		.count-pill,
		.user-info {
			display: none;
		}

		.sidebar-nav {
			gap: 0.5rem;
			padding-left: 0.5rem;
		}

		.nav-group + .nav-group {
			border-top: 1px solid var(--color-admin-border);
			padding-top: 0.5rem;
			margin-right: 0.5rem;
		}

		.sidebar-item {
			justify-content: center;
			padding: 0;
		}

		.sidebar-item.active {
			padding-right: 1px;
		}

		.pending-dot {
			display: block;
			position: absolute;
			top: -3px;
			right: -3px;
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: var(--color-admin-accent);
			border: 1px solid var(--color-admin-sidebar);
		}

		.sidebar-user {
			justify-content: center;
			padding: 0.5rem 0 0;
		}

		.sign-out-btn {
			display: none;
		}
	}

	/* Mobile: drawer */
	@media (max-width: 767px) {
		.mobile-topbar {
			display: flex;
		}

		.admin-shell {
			flex-direction: column;
			min-height: auto;
		}

		.sidebar {
			position: fixed;
			top: 0;
			left: -260px;
			width: 248px;
			height: 100dvh;
			z-index: 50;
			transition: left 0.25s ease;
		}

		.sidebar.drawer-open {
			left: 0;
		}

		.sidebar-header {
			display: flex;
		}

		.nav-group-label,
		.sidebar-label,
		.external-mark,
		.count-pill,
		.user-info {
			display: revert;
		}

		.sidebar-item {
			justify-content: flex-start;
			padding: 0 0.75rem;
		}

		.nav-group + .nav-group {
			border-top: 0;
			padding-top: 0;
			margin-right: 0;
		}

		.pending-dot {
			display: none;
		}

		.sidebar-user {
			justify-content: flex-start;
		}

		.sign-out-btn {
			display: flex;
		}

		.drawer-backdrop {
			display: block;
		}

		.page-head {
			margin: 1.25rem 1rem 0;
		}

		.page-head-tools {
			display: none;
		}

		.page-title {
			font-size: 1.75rem;
		}

		.content-body {
			padding: 1.25rem 1rem 3rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sidebar {
			transition: none;
		}
	}
</style>
