<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import LogoMark from './LogoMark.svelte';
	import DarkToggle from './DarkToggle.svelte';
	import TabStrip from './TabStrip.svelte';
	import type { CategoryWithCount, UserRole } from '$lib/types/index';

	interface NavUser {
		id: string;
		name: string;
		firstName: string | null;
		lastName: string | null;
		avatarUrl: string | null;
		role: UserRole;
	}

	interface NavAuthor {
		id: string;
		slug: string;
		displayName: string;
	}

	interface Props {
		navCategories?: CategoryWithCount[];
		navAuthors?: NavAuthor[];
		user?: NavUser | null;
	}

	let { navCategories = [], navAuthors = [], user = null }: Props = $props();

	// The slim bar: once the masthead has scrolled out of view, a short copy of the navigation
	// stays at the top so the reader can always move around or search.
	let mastEl = $state<HTMLElement | null>(null);
	let docked = $state(false);
	let scrollTick = false;

	function updateDock() {
		if (scrollTick) return;
		scrollTick = true;
		requestAnimationFrame(() => {
			scrollTick = false;
			docked = window.scrollY > (mastEl?.offsetHeight ?? 0);
		});
	}

	onMount(updateDock);

	let menuOpen = $state(false);
	let searchOpen = $state(false);
	let searchQuery = $state('');
	let searchInputEl = $state<HTMLInputElement | null>(null);
	let avatarDropdownOpen = $state(false);
	let authorsExpanded = $state(false);

	const displayName = $derived(
		user ? (user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.name) : ''
	);

	const userInitials = $derived(
		displayName
			.split(' ')
			.slice(0, 2)
			.map((w: string) => w[0])
			.join('')
			.toUpperCase()
	);

	function closeAvatarDropdown() {
		avatarDropdownOpen = false;
	}

	function handleAvatarKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeAvatarDropdown();
	}

	// Pre-fill search from current URL when on /search
	$effect(() => {
		const q = page.url.searchParams.get('q');
		if (page.url.pathname === '/search' && q) {
			searchQuery = q;
		}
	});

	$effect(() => {
		if (searchOpen) {
			searchInputEl?.focus();
		}
	});

	function submitSearch(q: string) {
		const trimmed = q.trim();
		if (!trimmed) return;
		goto(`/search?q=${encodeURIComponent(trimmed)}`);
		searchOpen = false;
		menuOpen = false;
		searchQuery = '';
	}

	function handleSearchKey(e: KeyboardEvent) {
		if (e.key === 'Enter') submitSearch(searchQuery);
		if (e.key === 'Escape') {
			searchOpen = false;
			searchQuery = '';
		}
	}

	function closeSearch() {
		searchOpen = false;
		searchQuery = '';
	}

	function closeMenu() {
		menuOpen = false;
		authorsExpanded = false;
	}

	$effect(() => {
		void page.url.pathname;
		menuOpen = false;
		authorsExpanded = false;
	});

	const currentPath = $derived(page.url.pathname);
	const isHome = $derived(currentPath === '/');
	const isPost = $derived(currentPath.startsWith('/posts/'));

	// The open tab: the category being browsed, or the category of the story being read.
	const openCategorySlug = $derived.by(() => {
		const match = currentPath.match(/^\/categories\/([^/]+)/);
		if (match) return decodeURIComponent(match[1]);
		if (isPost) {
			const post = (page.data as { post?: { category?: { slug: string } | null } }).post;
			return post?.category?.slug ?? null;
		}
		return null;
	});
</script>

<svelte:window onscroll={updateDock} onresize={updateDock} />

<header class="mast" class:mast-compact={isPost} bind:this={mastEl}>
	<div class="inner">
		<div class="mast-top">
			<LogoMark href="/" size={isPost ? 'md' : 'lg'} />

			<div class="right-controls">
				<!-- Search — desktop -->
				{#if searchOpen}
					<div class="search-wrap desktop-only">
						<input
							type="search"
							placeholder="Search…"
							bind:value={searchQuery}
							bind:this={searchInputEl}
							onkeydown={handleSearchKey}
							class="search-input"
							aria-label="Search articles"
						/>
						<button onclick={closeSearch} class="icon-btn" aria-label="Close search">
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								aria-hidden="true"
							>
								<line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" />
							</svg>
						</button>
					</div>
				{:else}
					<button
						onclick={() => (searchOpen = true)}
						class="icon-btn desktop-only"
						aria-label="Open search"
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 18 18"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							aria-hidden="true"
						>
							<circle cx="8" cy="8" r="5.5" /><line x1="12" y1="12" x2="16" y2="16" />
						</svg>
					</button>
				{/if}

				<DarkToggle />

				<!-- Auth state -->
				{#if user}
					<div class="avatar-wrap desktop-only">
						<button
							class="avatar-btn"
							onclick={() => (avatarDropdownOpen = !avatarDropdownOpen)}
							onkeydown={handleAvatarKeydown}
							aria-label="Account menu"
							aria-expanded={avatarDropdownOpen}
						>
							{#if user.avatarUrl}
								<img
									src={user.avatarUrl}
									alt={displayName}
									class="nav-avatar"
									width="32"
									height="32"
								/>
							{:else}
								<span class="nav-avatar-initials">{userInitials}</span>
							{/if}
						</button>

						{#if avatarDropdownOpen}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="avatar-backdrop" onclick={closeAvatarDropdown}></div>
							<div class="avatar-dropdown" role="menu">
								<a
									href="/profile"
									class="dropdown-item"
									onclick={closeAvatarDropdown}
									role="menuitem">My profile</a
								>
								{#if user.role === 'admin' || user.role === 'author'}
									<a
										href="/dashboard"
										class="dropdown-item"
										onclick={closeAvatarDropdown}
										role="menuitem">Dashboard</a
									>
								{/if}
								<form method="POST" action="/api/sign-out" class="dropdown-signout-form">
									<button type="submit" class="dropdown-item" role="menuitem">Sign out</button>
								</form>
							</div>
						{/if}
					</div>
				{:else}
					<a href="/login" class="signin-link desktop-only">Sign in</a>
				{/if}

				<!-- Menu — phones only -->
				<button
					onclick={() => (menuOpen = !menuOpen)}
					class="icon-btn mobile-only"
					aria-label="Menu"
					aria-expanded={menuOpen}
					aria-controls="site-menu"
				>
					{#if menuOpen}
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							aria-hidden="true"
						>
							<line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" />
						</svg>
					{:else}
						<svg
							width="18"
							height="12"
							viewBox="0 0 18 12"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							aria-hidden="true"
						>
							<line x1="0" y1="1" x2="18" y2="1" /><line x1="0" y1="6" x2="18" y2="6" /><line
								x1="0"
								y1="11"
								x2="18"
								y2="11"
							/>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		{#if menuOpen}
			<div class="menu-panel" id="site-menu">
				<div class="mobile-search-wrap">
					<input
						type="search"
						placeholder="Search articles…"
						bind:value={searchQuery}
						onkeydown={handleSearchKey}
						class="mobile-search-input"
						aria-label="Search articles"
					/>
				</div>

				<a href="/categories" class="menu-link" onclick={closeMenu}>All categories</a>

				{#if navAuthors.length > 0}
					<button
						class="menu-link menu-section-btn"
						onclick={() => (authorsExpanded = !authorsExpanded)}
						aria-expanded={authorsExpanded}
					>
						Authors
						<svg
							class="chevron"
							class:chevron-open={authorsExpanded}
							width="10"
							height="10"
							viewBox="0 0 10 10"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							aria-hidden="true"
						>
							<polyline points="2,3.5 5,6.5 8,3.5" />
						</svg>
					</button>
					{#if authorsExpanded}
						{#each navAuthors as author (author.id)}
							<a
								href="/authors/{encodeURIComponent(author.slug)}"
								class="menu-link menu-sub-link"
								onclick={closeMenu}>{author.displayName}</a
							>
						{/each}
					{/if}
				{/if}

				{#if user}
					<a href="/profile" class="menu-link" onclick={closeMenu}>My profile</a>
					{#if user.role === 'admin' || user.role === 'author'}
						<a href="/dashboard" class="menu-link" onclick={closeMenu}>Dashboard</a>
					{/if}
					<form method="POST" action="/api/sign-out">
						<button type="submit" class="menu-link menu-section-btn">Sign out</button>
					</form>
				{:else}
					<a href="/login" class="menu-link" onclick={closeMenu}>Sign in</a>
				{/if}
			</div>
		{/if}

		<!-- The tab strip: the page you are on is the one open tab -->
		<TabStrip categories={navCategories} {isHome} openSlug={openCategorySlug} label="Sections" />
	</div>
</header>

<!-- The slim bar. It is switched off (and hidden from keyboards and screen readers) until it shows. -->
<div class="dock" class:docked inert={!docked} aria-hidden={!docked}>
	<div class="dock-inner">
		<LogoMark href="/" size="sm" byline={false} />

		<TabStrip
			categories={navCategories}
			{isHome}
			openSlug={openCategorySlug}
			label="Sections, always at the top"
			dock
		/>

		<div class="dock-tools">
			<a href="/search" class="icon-btn" aria-label="Search">
				<svg
					width="18"
					height="18"
					viewBox="0 0 18 18"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					aria-hidden="true"
				>
					<circle cx="8" cy="8" r="5.5" /><line x1="12" y1="12" x2="16" y2="16" />
				</svg>
			</a>
			<span class="desktop-only"><DarkToggle /></span>
			{#if user}
				<a href="/profile" class="avatar-btn desktop-only" aria-label="My profile">
					{#if user.avatarUrl}
						<img src={user.avatarUrl} alt="" class="nav-avatar" width="32" height="32" />
					{:else}
						<span class="nav-avatar-initials">{userInitials}</span>
					{/if}
				</a>
			{:else}
				<a href="/login" class="signin-link desktop-only">Sign in</a>
			{/if}
		</div>
	</div>
</div>

<style>
	.mast {
		background: var(--paper2);
	}

	.inner {
		width: min(var(--max-w), 100% - 80px);
		margin: 0 auto;
	}

	.mast-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 16px;
		padding: 28px 0 20px;
	}

	.mast-compact .mast-top {
		padding: 24px 0 18px;
	}

	.right-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.icon-btn {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		transition: background-color 120ms ease;
	}

	.icon-btn:hover {
		background: var(--ink-10);
	}

	.icon-btn:active {
		background: var(--border);
	}

	.search-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.search-input {
		font-family: var(--ui);
		font-size: 15px;
		height: 44px;
		width: 240px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--cream);
		padding: 0 14px;
		color: var(--ink);
	}

	.signin-link {
		display: flex;
		align-items: center;
		min-height: 44px;
		padding: 0 6px 0 8px;
		font-family: var(--ui);
		font-size: 15px;
		font-weight: 600;
		color: var(--ink);
		text-decoration: none;
	}

	.signin-link:hover {
		color: var(--accent);
	}

	.avatar-wrap {
		position: relative;
	}

	.avatar-btn {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-avatar,
	.nav-avatar-initials {
		width: 32px;
		height: 32px;
		border-radius: 50%;
	}

	.nav-avatar {
		object-fit: cover;
		display: block;
	}

	.nav-avatar-initials {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--ink);
		font-family: var(--ui);
		font-size: 12px;
		font-weight: 700;
		color: var(--cream);
	}

	.avatar-backdrop {
		position: fixed;
		inset: 0;
		z-index: 59;
	}

	.avatar-dropdown {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		min-width: 168px;
		background: var(--cream);
		border: 1px solid var(--border);
		border-radius: 10px;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
		z-index: 60;
		overflow: hidden;
		padding: 4px 0;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		width: 100%;
		min-height: 44px;
		padding: 0 16px;
		font-family: var(--ui);
		font-size: 15px;
		color: var(--ink);
		text-decoration: none;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
	}

	.dropdown-item:hover {
		background: var(--ink-10);
	}

	.dropdown-signout-form {
		margin: 0;
	}

	/* ── Phone menu ── */
	.menu-panel {
		border-top: 1px solid var(--border);
		padding: 12px 0;
	}

	.mobile-search-wrap {
		padding: 0 0 8px;
	}

	.mobile-search-input {
		width: 100%;
		height: 44px;
		font-family: var(--ui);
		font-size: 16px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--cream);
		color: var(--ink);
		padding: 0 14px;
	}

	.menu-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		min-height: 48px;
		border: none;
		border-bottom: 1px solid var(--border);
		background: none;
		text-align: left;
		padding: 0;
		font-family: var(--ui);
		font-size: 16px;
		font-weight: 500;
		color: var(--ink);
		text-decoration: none;
		cursor: pointer;
	}

	.menu-sub-link {
		padding-left: 16px;
		font-size: 15px;
		color: var(--ink-60);
	}

	.menu-sub-link:hover {
		color: var(--ink);
	}

	.chevron {
		transition: transform 0.2s;
	}

	.chevron-open {
		transform: rotate(180deg);
	}

	/* ── The slim bar ──
	   Fixed to the top once the masthead is gone. Same paper, same open tab. */
	.dock {
		position: fixed;
		inset: 0 0 auto 0;
		z-index: 50;
		background: var(--paper2);
		border-bottom: 1px solid var(--border);
		transform: translateY(-100%);
		visibility: hidden;
		transition:
			transform 200ms ease,
			visibility 0s linear 200ms;
	}

	.dock.docked {
		transform: none;
		visibility: visible;
		transition-delay: 0s;
	}

	.dock-inner {
		display: flex;
		align-items: flex-end;
		gap: 18px;
		width: min(1100px, 100% - 48px);
		margin: 0 auto;
		padding-top: 8px;
		min-height: 52px;
	}

	.dock :global(.logo-wrap) {
		align-self: center;
		flex-shrink: 0;
		padding-bottom: 2px;
	}

	.dock :global(.logo-line) {
		font-size: 25px;
	}

	.dock-tools {
		display: flex;
		align-items: center;
		align-self: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.dock-tools .icon-btn {
		text-decoration: none;
	}

	:global(html) {
		scroll-padding-top: 64px;
	}

	@media (prefers-reduced-motion: reduce) {
		.dock {
			transition: none;
		}
	}

	@media print {
		.dock {
			display: none;
		}
	}

	.mobile-only {
		display: none;
	}

	@media (max-width: 1023px) {
		.mast-top {
			padding: 22px 0 16px;
		}
	}

	@media (max-width: 639px) {
		.inner {
			width: 100%;
		}

		.mast-top,
		.mast-compact .mast-top {
			align-items: center;
			padding: 14px 12px 8px 20px;
		}

		.mast-compact :global(.logo-byline) {
			display: none;
		}

		.menu-panel {
			padding: 12px 20px;
		}

		.dock-inner {
			width: 100%;
			gap: 8px;
			padding-left: 16px;
			padding-right: 8px;
		}

		.dock :global(.logo-line) {
			font-size: 22px;
		}

		.desktop-only {
			display: none !important;
		}

		.mobile-only {
			display: flex;
		}
	}
</style>
