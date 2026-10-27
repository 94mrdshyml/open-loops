<script lang="ts">
	import { onDestroy, onMount, tick, untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import FormField from '$lib/components/admin/FormField.svelte';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import TextInput from '$lib/components/admin/TextInput.svelte';
	import Textarea from '$lib/components/admin/Textarea.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Tab = 'general' | 'integrations' | 'seo' | 'email';
	type SaveState = 'idle' | 'saving' | 'saved' | 'error';
	type Busy = 'save' | 'test' | 'key' | 'exa' | 'indexnow' | null;

	interface ActionResultData {
		testEmailSent?: boolean;
		sentTo?: string;
		emailError?: string;
		openrouterNote?: string;
		openrouterError?: string;
		exaNote?: string;
		exaError?: string;
		indexnowNote?: string;
		indexnowError?: string;
		integrationsError?: string;
		generalError?: string;
	}

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'general', label: 'General' },
		{ id: 'integrations', label: 'Integrations' },
		{ id: 'seo', label: 'SEO' },
		{ id: 'email', label: 'Email' }
	];

	function isTab(value: string): value is Tab {
		return tabs.some((t) => t.id === value);
	}

	let activeTab = $state<Tab>('general');

	let saveState = $state<SaveState>('idle');
	let busy = $state<Busy>(null);
	let statusMessage = $state('');
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => pageTitle.set('Settings'));
	onDestroy(() => clearTimeout(resetTimer));

	function clearStatus() {
		clearTimeout(resetTimer);
		saveState = 'idle';
		busy = null;
		statusMessage = '';
	}

	// The hash picks the tab. Following a link to /dashboard/settings#integrations (from the
	// "Add analytics link" menu item or the home page) opens that tab and brings the Umami
	// share field into view. The page URL is read after hydration, so the server always
	// renders the first tab and the browser then swaps it.
	$effect(() => {
		const hash = page.url.hash.slice(1);
		if (hash === 'account') {
			void goto('/dashboard/account', { replaceState: true });
			return;
		}
		if (!isTab(hash) || hash === untrack(() => activeTab)) return;
		activeTab = hash;
		clearStatus();
		if (hash === 'integrations') void showUmamiShareField();
	});

	async function showUmamiShareField() {
		await tick();
		requestAnimationFrame(() => {
			const field = document.getElementById('umami-share');
			if (!field) return;
			field.scrollIntoView({ block: 'center' });
			field.focus({ preventScroll: true });
		});
	}

	function setTab(t: Tab) {
		if (t === activeTab) return;
		activeTab = t;
		clearStatus();
		if (browser) replaceState(`#${t}`, {});
	}

	async function onTabKeydown(e: KeyboardEvent) {
		const last = tabs.length - 1;
		const i = tabs.findIndex((t) => t.id === activeTab);
		let next: number;
		if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
		else if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = last;
		else return;
		e.preventDefault();
		setTab(tabs[next].id);
		await tick();
		document.getElementById(`tab-${tabs[next].id}`)?.focus();
	}

	function submitter(kind: 'save' | 'test' | 'key' | 'exa' | 'indexnow'): SubmitFunction {
		return () => {
			clearTimeout(resetTimer);
			busy = kind;
			saveState = 'saving';
			statusMessage =
				kind === 'test'
					? 'Sending test email…'
					: kind === 'key'
						? 'Checking the key…'
						: kind === 'exa'
							? 'Saving the key…'
							: kind === 'indexnow'
								? 'Working…'
								: 'Saving…';

			return async ({ result, update }) => {
				busy = null;
				if (result.type === 'success') {
					const d = result.data as ActionResultData | undefined;
					saveState = 'saved';
					statusMessage = d?.testEmailSent
						? `Test email sent to ${d.sentTo}.`
						: (d?.openrouterNote ?? d?.exaNote ?? d?.indexnowNote ?? 'Saved.');
					if (kind === 'key') openrouterKey = '';
					if (kind === 'exa') exaKey = '';
					resetTimer = setTimeout(clearStatus, 6000);
					await update({ reset: false });
				} else if (result.type === 'failure') {
					const d = result.data as ActionResultData | undefined;
					saveState = 'error';
					statusMessage =
						d?.emailError ??
						d?.openrouterError ??
						d?.exaError ??
						d?.indexnowError ??
						d?.integrationsError ??
						d?.generalError ??
						"Couldn't save. Check the details and try again.";
				} else {
					saveState = 'error';
					statusMessage = "Couldn't save. Check your connection and try again.";
				}
			};
		};
	}

	const s = data.settings;

	let siteName = $state(s.site_name ?? '');
	let tagline = $state(s.site_tagline ?? '');
	let postsPerPage = $state(s.posts_per_page ?? '12');
	let gtmId = $state(s.gtm_id ?? '');
	let ga4Id = $state(s.ga4_id ?? '');
	let metaPixelId = $state(s.meta_pixel_id ?? '');
	let umamiWebsiteId = $state(s.umami_website_id ?? '');
	let umamiShareUrl = $state(s.umami_share_url ?? '');
	let metaDescription = $state(s.meta_description ?? '');
	let ogImageUrl = $state(s.og_image_url ?? '');
	let resendApiKey = $state('');
	let openrouterKey = $state('');
	let exaKey = $state('');
	let resendFromEmail = $state(s.resend_from_email ?? '');

	const savedKeyHint = $derived(
		data.resendKeyLast4 ? `Saved key: ****${data.resendKeyLast4}` : 'No key saved yet'
	);

	let indexnowEnabled = $state(untrack(() => data.indexnow.enabled));

	function formatLast(last: NonNullable<PageData['indexnow']['last']>): string {
		const when = new Date(last.at).toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
		const pages = `${last.count} ${last.count === 1 ? 'page' : 'pages'}`;
		return last.result === 'ok'
			? `Last sent ${when}: ${pages}.`
			: `Last try ${when} failed (${last.result}).`;
	}

	function formatTldrLast(last: NonNullable<PageData['tldrLast']>): string {
		const when = new Date(last.at).toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
		if (last.provider === 'exa') return `The last In brief was written by Exa (${when}).`;
		if (last.provider === 'openrouter') {
			return last.note
				? `The last In brief was written by OpenRouter (${when}). Exa did not write it: ${last.note}.`
				: `The last In brief was written by OpenRouter (${when}).`;
		}
		return `The last In brief could not be written (${when}): ${last.note ?? 'no reason was recorded'}.`;
	}

	const exaHint = $derived(
		data.exaKeyLast4
			? `Saved key: ****${data.exaKeyLast4}. Paste a new key to replace it.`
			: data.exaEnvFallback
				? 'No key saved here yet. The key set on the server is being used for now.'
				: 'No key saved yet. OpenRouter writes the points until you add one.'
	);

	const openrouterHint = $derived(
		data.openrouterKeyLast4
			? `Saved key: ****${data.openrouterKeyLast4}. Paste a new key to replace it.`
			: data.openrouterEnvFallback
				? 'No key saved here yet. The key set on the server is being used for now.'
				: 'No key saved yet. Story summaries cannot be written until you add one.'
	);
</script>

{#snippet status()}
	<div class="status">
		{#if saveState === 'error'}
			<p class="status-text is-error" role="alert">{statusMessage}</p>
		{:else}
			<p class="status-text" class:is-saved={saveState === 'saved'} role="status">
				{#if saveState === 'saved'}
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						aria-hidden="true"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
				{/if}
				{statusMessage}
			</p>
		{/if}
	</div>
{/snippet}

<div class="settings">
	<div class="ad-tabs" role="tablist" aria-label="Settings sections">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				role="tab"
				id="tab-{tab.id}"
				class="ad-tab"
				aria-selected={activeTab === tab.id}
				aria-controls="panel-{tab.id}"
				tabindex={activeTab === tab.id ? 0 : -1}
				onclick={() => setTab(tab.id)}
				onkeydown={onTabKeydown}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- General -->
	{#if activeTab === 'general'}
		<div class="panel" role="tabpanel" id="panel-general" aria-labelledby="tab-general">
			<form method="POST" action="?/saveGeneral" use:enhance={submitter('save')}>
				<SectionHeading label="Site name and tagline" />
				<div class="fields">
					<FormField label="Site name" fieldId="site-name">
						<TextInput
							id="site-name"
							name="siteName"
							bind:value={siteName}
							placeholder="Open Tabs"
						/>
					</FormField>
					<FormField label="Tagline" fieldId="tagline">
						<TextInput
							id="tagline"
							name="tagline"
							bind:value={tagline}
							placeholder="Explainer content on business, politics & geopolitics"
						/>
					</FormField>
				</div>

				<SectionHeading label="Home page" />
				<div class="fields">
					<FormField
						label="Latest stories shown"
						fieldId="posts-per-page"
						hint="How many stories the Latest list on the home page shows at first, and how many more each press of Load more stories adds. A whole number from 4 to 50."
					>
						<TextInput
							id="posts-per-page"
							name="postsPerPage"
							bind:value={postsPerPage}
							placeholder="12"
						/>
					</FormField>
				</div>
				<div class="footer">
					{@render status()}
					<button type="submit" class="ad-btn" disabled={saveState === 'saving'}>
						{busy === 'save' ? 'Saving…' : 'Save changes'}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Integrations -->
	{#if activeTab === 'integrations'}
		<div class="panel" role="tabpanel" id="panel-integrations" aria-labelledby="tab-integrations">
			<form method="POST" action="?/saveIntegrations" use:enhance={submitter('save')}>
				<div id="integrations">
					<SectionHeading label="Umami analytics" />
				</div>
				<div class="fields">
					<FormField label="Umami Website ID" fieldId="umami-id">
						<TextInput
							id="umami-id"
							name="umamiWebsiteId"
							bind:value={umamiWebsiteId}
							placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
						/>
					</FormField>
					<FormField label="Umami Share URL" fieldId="umami-share">
						<TextInput
							id="umami-share"
							name="umamiShareUrl"
							bind:value={umamiShareUrl}
							placeholder="https://cloud.umami.is/share/…"
							type="url"
						/>
					</FormField>
					<p class="note">
						Analytics are in Umami. Paste your Umami share link here and it appears in the dashboard
						menu.
					</p>
				</div>

				<SectionHeading label="Tags and pixels" />
				<div class="fields">
					<FormField label="GTM Container ID" fieldId="gtm-id" hint="Google Tag Manager container.">
						<TextInput id="gtm-id" name="gtmId" bind:value={gtmId} placeholder="GTM-XXXXXXX" />
					</FormField>
					<FormField label="GA4 Measurement ID" fieldId="ga4-id">
						<TextInput id="ga4-id" name="ga4Id" bind:value={ga4Id} placeholder="G-XXXXXXXXXX" />
					</FormField>
					<FormField label="Meta Pixel ID" fieldId="meta-pixel-id">
						<TextInput
							id="meta-pixel-id"
							name="metaPixelId"
							bind:value={metaPixelId}
							placeholder="XXXXXXXXXXXXXXXXXX"
						/>
					</FormField>
					<p class="note">Changes to IDs take effect on the next page load.</p>
				</div>

				<div class="footer">
					{@render status()}
					<button type="submit" class="ad-btn" disabled={saveState === 'saving'}>
						{busy === 'save' ? 'Saving…' : 'Save changes'}
					</button>
				</div>
			</form>

			<form
				method="POST"
				action="?/saveOpenRouter"
				use:enhance={submitter('key')}
				class="key-form"
				autocomplete="off"
			>
				<SectionHeading label="OpenRouter (story summaries)" />
				<div class="fields">
					<FormField label="OpenRouter API key" fieldId="openrouter-key" hint={openrouterHint}>
						<TextInput
							id="openrouter-key"
							name="openrouterApiKey"
							type="password"
							bind:value={openrouterKey}
							placeholder="sk-or-v1-…"
						/>
					</FormField>
					<p class="note">
						Used to write the "In brief" points for each story when it is published. The key is
						stored safely on the server and is never shown again, only its last four characters. You
						can replace it here at any time. Changes apply to the next summary written.
					</p>
				</div>
				<div class="footer">
					{@render status()}
					<div class="key-actions">
						<button
							type="submit"
							class="ad-btn"
							disabled={saveState === 'saving' || !openrouterKey}
						>
							{busy === 'key' ? 'Checking…' : 'Save key'}
						</button>
						{#if data.openrouterKeyLast4}
							<!-- After "Save key" in the page, so pressing Enter in the field never removes the key -->
							<button
								type="submit"
								name="removeKey"
								value="1"
								class="ad-btn ad-btn--quiet remove-key"
								disabled={saveState === 'saving'}
							>
								Remove saved key
							</button>
						{/if}
					</div>
				</div>
			</form>

			<form
				method="POST"
				action="?/saveExa"
				use:enhance={submitter('exa')}
				class="key-form"
				autocomplete="off"
			>
				<SectionHeading label="Exa (reads the live story for the In brief points)" />
				<div class="fields">
					<FormField label="Exa API key" fieldId="exa-key" hint={exaHint}>
						<TextInput
							id="exa-key"
							name="exaApiKey"
							type="password"
							bind:value={exaKey}
							placeholder="Paste your Exa key"
						/>
					</FormField>
					<p class="note">
						When a story goes live, Exa reads the published page and writes the points from it. If
						Exa is not set up, cannot read the page, or gives points that break a rule (too long, a
						number that is not in the story, words in quotation marks the story does not use),
						OpenRouter writes them instead, as before. Drafts always use OpenRouter, because Exa can
						only read pages that are live. The key is stored on the server and only its last four
						characters are shown.
					</p>
					{#if data.tldrLast}
						<p class="note" role="status">{formatTldrLast(data.tldrLast)}</p>
					{/if}
				</div>
				<div class="footer">
					{@render status()}
					<div class="key-actions">
						<button type="submit" class="ad-btn" disabled={saveState === 'saving' || !exaKey}>
							{busy === 'exa' ? 'Saving…' : 'Save key'}
						</button>
						{#if data.exaKeyLast4}
							<!-- After "Save key" in the page, so pressing Enter in the field never removes the key -->
							<button
								type="submit"
								name="removeKey"
								value="1"
								class="ad-btn ad-btn--quiet remove-key"
								disabled={saveState === 'saving'}
							>
								Remove saved key
							</button>
						{/if}
					</div>
				</div>
			</form>

			<form
				method="POST"
				action="?/saveIndexNow"
				use:enhance={submitter('indexnow')}
				class="key-form"
			>
				<SectionHeading label="IndexNow (tell search engines about new stories)" />
				<div class="fields">
					<label class="check">
						<input type="checkbox" name="indexnowEnabled" bind:checked={indexnowEnabled} />
						<span>Tell search engines when a story is published, changed or removed</span>
					</label>
					<p class="note">
						Bing, Yandex and a few others then visit the page within minutes instead of days. Google
						does not use this. Nothing is sent while you are writing, only when you press Publish,
						Update or Delete. The ownership file is at
						<a class="ad-link" href={data.indexnow.keyUrl}>{data.indexnow.keyUrl}</a>.
					</p>
					{#if data.indexnow.last}
						<p class="note" role="status">{formatLast(data.indexnow.last)}</p>
					{/if}
				</div>
				<div class="footer">
					{@render status()}
					<div class="key-actions">
						<button type="submit" class="ad-btn" disabled={saveState === 'saving'}>
							{busy === 'indexnow' ? 'Working…' : 'Save'}
						</button>
						<button
							type="submit"
							formaction="?/sendSiteIndexNow"
							class="ad-btn ad-btn--quiet"
							disabled={saveState === 'saving'}
						>
							Send the whole site now
						</button>
					</div>
				</div>
			</form>
		</div>
	{/if}

	<!-- SEO -->
	{#if activeTab === 'seo'}
		<div class="panel" role="tabpanel" id="panel-seo" aria-labelledby="tab-seo">
			<form method="POST" action="?/saveSeoDefaults" use:enhance={submitter('save')}>
				<SectionHeading label="Search and sharing defaults" />
				<p class="note lead">
					These are used when a story has no search or sharing details of its own.
				</p>
				<div class="fields">
					<FormField label="Default meta description" fieldId="meta-desc">
						<Textarea
							id="meta-desc"
							name="defaultMetaDescription"
							bind:value={metaDescription}
							rows={3}
							maxlength={160}
							placeholder="A short description of this site for search engines…"
						/>
					</FormField>
					<FormField
						label="Default share image URL"
						fieldId="og-image"
						hint="Paste the image address from the media library."
					>
						<TextInput
							id="og-image"
							name="defaultOgImageUrl"
							bind:value={ogImageUrl}
							placeholder="https://assets.indexdaily.in/og-default.jpg"
							type="url"
						/>
					</FormField>
				</div>
				<div class="footer">
					{@render status()}
					<button type="submit" class="ad-btn" disabled={saveState === 'saving'}>
						{busy === 'save' ? 'Saving…' : 'Save changes'}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Email -->
	{#if activeTab === 'email'}
		<div class="panel" role="tabpanel" id="panel-email" aria-labelledby="tab-email">
			<form method="POST" action="?/saveEmail" use:enhance={submitter('save')}>
				<SectionHeading label="Sending email" />
				<div class="fields">
					<FormField label="Resend API key" fieldId="resend-key" hint={savedKeyHint}>
						<TextInput
							id="resend-key"
							name="resendApiKey"
							bind:value={resendApiKey}
							type="password"
							placeholder="re_••••••••"
						/>
					</FormField>
					<FormField label="From email" fieldId="from-email">
						<TextInput
							id="from-email"
							name="resendFromEmail"
							bind:value={resendFromEmail}
							type="email"
							placeholder="noreply@indexdaily.in"
						/>
					</FormField>
					<p class="note">
						The test email goes to your own address and uses the key and from address above.
					</p>
				</div>
				<div class="footer">
					{@render status()}
					<div class="buttons">
						<button
							type="submit"
							form="test-email-form"
							class="ad-btn ad-btn--quiet"
							disabled={saveState === 'saving'}
						>
							{busy === 'test' ? 'Sending…' : 'Send test email'}
						</button>
						<button type="submit" class="ad-btn" disabled={saveState === 'saving'}>
							{busy === 'save' ? 'Saving…' : 'Save changes'}
						</button>
					</div>
				</div>
			</form>

			<!-- A separate form so the test email hits its own action -->
			<form
				id="test-email-form"
				method="POST"
				action="?/sendTestEmail"
				hidden
				use:enhance={submitter('test')}
			>
				<input type="hidden" name="resendApiKey" value={resendApiKey} />
				<input type="hidden" name="resendFromEmail" value={resendFromEmail} />
			</form>
		</div>
	{/if}
</div>

<style>
	.settings {
		max-width: 44rem;
	}

	.panel {
		padding-top: 1.75rem;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		margin-bottom: 2.25rem;
	}

	.note {
		margin: 0;
		font-size: var(--text-sm);
		line-height: 1.5;
		color: var(--color-admin-text-muted);
	}

	.note a {
		overflow-wrap: anywhere;
	}

	.note.lead {
		margin: -0.25rem 0 1.25rem;
	}

	.key-form {
		margin-top: 2.5rem;
	}

	.key-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.remove-key {
		order: -1;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 44px;
		font-size: var(--text-sm);
		color: var(--color-admin-text);
		cursor: pointer;
	}

	.check input {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		accent-color: var(--color-admin-accent);
	}

	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-admin-border);
	}

	.buttons {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status {
		min-height: 1.25rem;
		flex: 1;
		min-width: 0;
	}

	.status-text {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin: 0;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-admin-text-muted);
	}

	.status-text.is-saved {
		color: var(--color-status-published);
	}

	.status-text.is-error {
		color: var(--color-status-error);
	}

	@media (max-width: 599px) {
		.ad-tabs :global(.ad-tab) {
			padding-inline: 0.75rem;
		}

		.footer {
			flex-direction: column-reverse;
			align-items: stretch;
		}

		.buttons {
			flex-direction: column-reverse;
			align-items: stretch;
		}

		.footer :global(.ad-btn) {
			width: 100%;
		}
	}
</style>
