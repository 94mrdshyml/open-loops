<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import { toast } from '$lib/stores/toast';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import FormField from '$lib/components/admin/FormField.svelte';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import StatCard from '$lib/components/admin/StatCard.svelte';
	import TextInput from '$lib/components/admin/TextInput.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	onMount(() => pageTitle.set('Emails'));

	const TABS = [
		{ id: 'templates', label: 'Templates' },
		{ id: 'logs', label: 'Logs' },
		{ id: 'stats', label: 'Stats' }
	] as const;
	type Tab = (typeof TABS)[number]['id'];
	let activeTab = $state<Tab>('templates');

	function onTabKey(e: KeyboardEvent, index: number) {
		let next = index;
		if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
		else if (e.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = TABS.length - 1;
		else return;
		e.preventDefault();
		activeTab = TABS[next].id;
		tick().then(() => document.getElementById(`tab-${TABS[next].id}`)?.focus());
	}

	// Template form state, seeded from load data
	let fromName = $state(data.emailSettings.fromName);
	let fromEmail = $state(data.emailSettings.fromEmail);
	let nlSubject = $state(data.emailSettings.nlSubject);
	let nlHeadline = $state(data.emailSettings.nlHeadline);
	let nlBodyText = $state(data.emailSettings.nlBodyText);
	let regSubject = $state(data.emailSettings.regSubject);

	let nlPreviewHtml = $state(data.nlPreviewHtml);
	let regPreviewHtml = $state(data.regPreviewHtml);

	let nlHeadlineEl = $state<HTMLInputElement | undefined>(undefined);
	let nlBodyTextEl = $state<HTMLTextAreaElement | undefined>(undefined);

	// Where each form is: nothing yet, saving, saved or failed
	type FormKey = 'sender' | 'newsletter' | 'registration' | 'testNewsletter' | 'testRegistration';
	type FormStatus = 'idle' | 'saving' | 'saved' | 'error';
	let status = $state<Record<FormKey, FormStatus>>({
		sender: 'idle',
		newsletter: 'idle',
		registration: 'idle',
		testNewsletter: 'idle',
		testRegistration: 'idle'
	});

	function touch(key: FormKey) {
		if (status[key] !== 'saving') status[key] = 'idle';
	}

	function track(key: FormKey): SubmitFunction {
		return () => {
			status[key] = 'saving';
			return async ({ result, update }) => {
				// A thrown error would replace the page, so show it beside the form instead
				if (result.type === 'error') {
					status[key] = 'error';
					return;
				}
				await update({ reset: false });
				status[key] = result.type === 'success' ? 'saved' : 'error';
			};
		};
	}

	// Live preview: debounced re-render on headline/body change
	$effect(() => {
		const headline = nlHeadline;
		const bodyText = nlBodyText;
		const timer = setTimeout(async () => {
			const res = await fetch('/api/email-preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'newsletter', headline, bodyText })
			});
			if (res.ok) {
				const payload = (await res.json()) as { html?: string };
				if (payload.html) nlPreviewHtml = payload.html;
			}
		}, 600);
		return () => clearTimeout(timer);
	});

	const MERGE_TAGS = ['{{firstName}}', '{{lastName}}'];

	async function insertTag(
		el: HTMLInputElement | HTMLTextAreaElement,
		tag: string,
		getValue: () => string,
		setValue: (v: string) => void
	) {
		const start = el.selectionStart ?? el.value.length;
		const end = el.selectionEnd ?? el.value.length;
		const current = getValue();
		setValue(current.slice(0, start) + tag + current.slice(end));
		touch('newsletter');
		await tick();
		el.focus();
		el.setSelectionRange(start + tag.length, start + tag.length);
	}

	$effect(() => {
		if (form && 'success' in form && form.success) {
			if ('testSentTo' in form && form.testSentTo) {
				toast.success(`Test email sent to ${form.testSentTo}`);
			} else if ('saved' in form) {
				toast.success('Template saved');
			}
			if ('nlPreviewHtml' in form && form.nlPreviewHtml) {
				nlPreviewHtml = form.nlPreviewHtml as string;
			}
			if ('regPreviewHtml' in form && form.regPreviewHtml) {
				regPreviewHtml = form.regPreviewHtml as string;
			}
		}
		if (form && 'testError' in form && form.testError) {
			toast.error(form.testError as string);
		}
	});

	// Sending a test goes through a confirmation that names the recipient
	let testing = $state<'newsletter' | 'registration' | null>(null);
	let nlTestForm = $state<HTMLFormElement | undefined>(undefined);
	let regTestForm = $state<HTMLFormElement | undefined>(undefined);

	function confirmTest() {
		const which = testing;
		testing = null;
		if (which === 'newsletter') nlTestForm?.requestSubmit();
		if (which === 'registration') regTestForm?.requestSubmit();
	}

	function formatDate(d: Date | string | null | undefined): string {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function typeLabel(type: string): string {
		return type === 'newsletter_welcome' ? 'Newsletter' : 'Registration';
	}

	// Delivery state as text first; the marker and colour only back it up
	function tone(event: string | null | undefined): 'good' | 'bad' | 'plain' {
		if (event === 'delivered' || event === 'opened' || event === 'clicked') return 'good';
		if (event === 'bounced' || event === 'failed' || event === 'complained') return 'bad';
		return 'plain';
	}
</script>

<div class="emails-page">
	<div class="ad-tabs" role="tablist" aria-label="Email sections">
		{#each TABS as tab, i (tab.id)}
			<button
				type="button"
				role="tab"
				id="tab-{tab.id}"
				class="ad-tab"
				aria-selected={activeTab === tab.id}
				aria-controls="panel-{tab.id}"
				tabindex={activeTab === tab.id ? 0 : -1}
				onclick={() => (activeTab = tab.id)}
				onkeydown={(e) => onTabKey(e, i)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Templates tab -->
	{#if activeTab === 'templates'}
		<div class="templates" role="tabpanel" id="panel-templates" aria-labelledby="tab-templates">
			<section>
				<SectionHeading label="Sender" />
				<form
					method="POST"
					action="?/saveSenderSettings"
					class="form sender-form"
					use:enhance={track('sender')}
				>
					<div class="sender-fields">
						<FormField label="From name" fieldId="from-name">
							<TextInput
								id="from-name"
								name="fromName"
								bind:value={fromName}
								placeholder="Open Tabs"
								oninput={() => touch('sender')}
							/>
						</FormField>
						<FormField
							label="From email"
							fieldId="from-email"
							hint="Used instead of the default sender. The domain must be verified in Resend."
						>
							<TextInput
								id="from-email"
								name="fromEmail"
								type="email"
								bind:value={fromEmail}
								placeholder="hello@yourdomain.com"
								oninput={() => touch('sender')}
							/>
						</FormField>
					</div>
					<div class="form-footer">
						<button type="submit" class="ad-btn" disabled={status.sender === 'saving'}>
							{status.sender === 'saving' ? 'Saving' : 'Save sender'}
						</button>
						{@render note('sender', 'Saved')}
					</div>
				</form>
			</section>

			<section>
				<SectionHeading label="Newsletter welcome" />
				<div class="template-layout">
					<div>
						<form
							method="POST"
							action="?/saveNewsletterTemplate"
							class="form"
							use:enhance={track('newsletter')}
						>
							<div class="fields">
								<FormField label="Subject line" fieldId="nl-subject">
									<TextInput
										id="nl-subject"
										name="nlSubject"
										bind:value={nlSubject}
										placeholder="Welcome to Open Tabs Newsletter"
										oninput={() => touch('newsletter')}
									/>
								</FormField>
								<FormField
									label="Headline"
									fieldId="nl-headline"
									hint="Leave blank to use the default headline."
								>
									{@render mergeTags(
										'headline',
										() => nlHeadlineEl,
										() => nlHeadline,
										(v) => (nlHeadline = v)
									)}
									<input
										id="nl-headline"
										name="nlHeadline"
										type="text"
										class="field-input"
										bind:value={nlHeadline}
										bind:this={nlHeadlineEl}
										oninput={() => touch('newsletter')}
										placeholder="Welcome aboard."
									/>
								</FormField>
								<FormField
									label="Body text"
									fieldId="nl-body"
									hint="One paragraph. Leave blank to use the default text."
								>
									{@render mergeTags(
										'body text',
										() => nlBodyTextEl,
										() => nlBodyText,
										(v) => (nlBodyText = v)
									)}
									<textarea
										id="nl-body"
										name="nlBodyText"
										class="field-input field-textarea"
										rows={4}
										bind:value={nlBodyText}
										bind:this={nlBodyTextEl}
										oninput={() => touch('newsletter')}
										placeholder="Leave blank to use the default text"
									></textarea>
								</FormField>
							</div>
							<div class="form-footer">
								<button type="submit" class="ad-btn" disabled={status.newsletter === 'saving'}>
									{status.newsletter === 'saving' ? 'Saving' : 'Save template'}
								</button>
								<button
									type="button"
									class="ad-btn ad-btn--quiet"
									disabled={status.testNewsletter === 'saving'}
									onclick={() => (testing = 'newsletter')}
								>
									{status.testNewsletter === 'saving' ? 'Sending' : 'Send test'}
								</button>
								{@render note('newsletter', 'Saved')}
								{@render note('testNewsletter', 'Test sent')}
							</div>
						</form>
						<form
							bind:this={nlTestForm}
							method="POST"
							action="?/sendTestEmail"
							class="hidden"
							use:enhance={track('testNewsletter')}
						>
							<input type="hidden" name="template" value="newsletter" />
						</form>
					</div>
					{@render preview('Newsletter welcome preview', nlPreviewHtml)}
				</div>
			</section>

			<section>
				<SectionHeading label="Registration welcome" />
				<div class="template-layout">
					<div>
						<form
							method="POST"
							action="?/saveRegistrationTemplate"
							class="form"
							use:enhance={track('registration')}
						>
							<div class="fields">
								<FormField
									label="Subject line"
									fieldId="reg-subject"
									hint="The body is always the standard account confirmation."
								>
									<TextInput
										id="reg-subject"
										name="regSubject"
										bind:value={regSubject}
										placeholder="Welcome to Open Tabs"
										oninput={() => touch('registration')}
									/>
								</FormField>
							</div>
							<div class="form-footer">
								<button type="submit" class="ad-btn" disabled={status.registration === 'saving'}>
									{status.registration === 'saving' ? 'Saving' : 'Save template'}
								</button>
								<button
									type="button"
									class="ad-btn ad-btn--quiet"
									disabled={status.testRegistration === 'saving'}
									onclick={() => (testing = 'registration')}
								>
									{status.testRegistration === 'saving' ? 'Sending' : 'Send test'}
								</button>
								{@render note('registration', 'Saved')}
								{@render note('testRegistration', 'Test sent')}
							</div>
						</form>
						<form
							bind:this={regTestForm}
							method="POST"
							action="?/sendTestEmail"
							class="hidden"
							use:enhance={track('testRegistration')}
						>
							<input type="hidden" name="template" value="registration" />
						</form>
					</div>
					{@render preview('Registration welcome preview', regPreviewHtml)}
				</div>
			</section>
		</div>
	{/if}

	<!-- Logs tab -->
	{#if activeTab === 'logs'}
		<div role="tabpanel" id="panel-logs" aria-labelledby="tab-logs">
			<SectionHeading
				label="Sent emails"
				meta={data.sends.length > 0
					? data.sends.length === 50
						? 'Latest 50'
						: `${data.sends.length} ${data.sends.length === 1 ? 'email' : 'emails'}`
					: undefined}
			/>
			{#if data.sends.length === 0}
				<EmptyState
					message="No emails sent yet"
					sublabel="Welcome emails appear here once readers register or subscribe."
				/>
			{:else}
				<div class="logs">
					<AdminTable columns={['Subject', 'To', 'Type', 'Status', 'Sent']}>
						{#each data.sends as send (send.id)}
							{@const event = send.lastEvent ?? 'sent'}
							<tr>
								<td class="c-subject">
									<a href="/dashboard/emails/{send.id}" class="row-link">{send.subject}</a>
								</td>
								<td class="c-to">{send.toEmail}</td>
								<td class="c-type"><span class="type">{typeLabel(send.type)}</span></td>
								<td class="c-status">
									<span class="state state-{tone(send.lastEvent)}">{event}</span>
								</td>
								<td class="c-sent">{formatDate(send.sentAt)}</td>
							</tr>
						{/each}
					</AdminTable>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Stats tab -->
	{#if activeTab === 'stats'}
		<div role="tabpanel" id="panel-stats" aria-labelledby="tab-stats">
			<SectionHeading label="Email totals" meta="All time" />
			<div class="stats">
				<StatCard label="Total sent" value={data.stats.total} accent />
				<StatCard label="Delivered" value={data.stats.delivered} />
				<StatCard label="Opened" value={data.stats.opened} />
				<StatCard label="Clicked" value={data.stats.clicked} />
				<StatCard label="Bounced" value={data.stats.bounced} />
			</div>
		</div>
	{/if}
</div>

{#snippet note(key: FormKey, savedText: string)}
	{#if status[key] === 'saved'}
		<span class="note"><span aria-hidden="true">✓</span> {savedText}</span>
	{:else if status[key] === 'error'}
		<span class="note note-error" role="alert">
			Could not {key.startsWith('test') ? 'send' : 'save'}. Check your connection and try again.
		</span>
	{/if}
{/snippet}

{#snippet mergeTags(
	what: string,
	getEl: () => HTMLInputElement | HTMLTextAreaElement | undefined,
	getValue: () => string,
	setValue: (v: string) => void
)}
	<div class="merge-tags">
		<span class="merge-label">Insert</span>
		{#each MERGE_TAGS as tag (tag)}
			<button
				type="button"
				class="ad-btn ad-btn--quiet ad-btn--sm merge-chip"
				aria-label="Insert {tag} into the {what}"
				onclick={() => {
					const el = getEl();
					if (el) insertTag(el, tag, getValue, setValue);
				}}
			>
				{tag}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet preview(title: string, html: string)}
	<div class="preview">
		<h3 class="preview-label">Preview</h3>
		<div class="frame">
			{#if html}
				<iframe {title} srcdoc={html} class="frame-page" sandbox="allow-same-origin"></iframe>
			{:else}
				<p class="frame-empty">Preview unavailable. Save the template and reload the page.</p>
			{/if}
		</div>
		<p class="preview-note">Shown on a light page, as most mail apps show it, in both themes.</p>
	</div>
{/snippet}

<ConfirmModal
	open={testing !== null}
	title={`Send a test to ${data.user.email}?`}
	message={`This sends a real email to ${data.user.email}, with [TEST] at the start of the subject. It uses the saved version of the template, so save any changes first.`}
	confirmLabel="Send test email"
	danger={false}
	onConfirm={confirmTest}
	onCancel={() => (testing = null)}
/>

<style>
	.emails-page {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.templates {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	/* Forms */
	.form {
		display: flex;
		flex-direction: column;
	}

	.sender-form {
		max-width: 44rem;
	}

	.sender-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		align-items: start;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-admin-border);
	}

	.hidden {
		display: none;
	}

	.note {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-status-published);
	}

	.note-error {
		color: var(--color-status-error);
	}

	.field-input {
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

	.field-input::placeholder {
		color: var(--color-admin-text-muted);
		opacity: 0.8;
	}

	.field-input:hover {
		border-color: var(--color-admin-text-muted);
	}

	.field-input:focus-visible {
		outline: 2px solid var(--color-admin-accent);
		outline-offset: 1px;
		border-color: var(--color-admin-accent);
	}

	.field-textarea {
		resize: vertical;
		line-height: 1.5;
	}

	.merge-tags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.merge-label {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}

	.merge-chip {
		font-family: var(--font-mono);
	}

	/* Template and preview */
	.template-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 2.5rem;
		align-items: start;
	}

	.preview {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.preview-label {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: var(--tracking-caps);
		text-transform: uppercase;
		color: var(--color-admin-text-muted);
	}

	/* The email keeps its own colours. Only the frame around it follows the theme. */
	.frame {
		padding: 0.75rem;
		background: var(--color-admin-surface-hover);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
	}

	.frame-page {
		display: block;
		width: 100%;
		height: 500px;
		border: 0;
		border-radius: 4px;
		color-scheme: light;
	}

	.frame-empty {
		margin: 0;
		padding: 2.5rem 1rem;
		text-align: center;
		font-size: var(--text-sm);
		color: var(--color-admin-text-muted);
	}

	.preview-note {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}

	/* Logs */
	.logs :global(.table-wrap) {
		border-top: none;
	}

	.c-subject {
		max-width: 22rem;
	}

	.row-link {
		font-family: var(--serif);
		font-size: 1.0625rem;
		font-weight: 500;
		line-height: 1.3;
		color: var(--color-admin-text);
		text-decoration: none;
		overflow-wrap: anywhere;
	}

	/* The whole row opens the email */
	.row-link::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	.logs :global(tbody tr) {
		position: relative;
	}

	.row-link:hover {
		color: var(--color-admin-accent);
	}

	.c-to {
		overflow-wrap: anywhere;
		color: var(--color-admin-text-muted);
	}

	.c-sent {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
		white-space: nowrap;
	}

	.type {
		display: inline-flex;
		padding: 0.2em 0.65em;
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 999px;
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
	}

	.state {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		padding: 0.2em 0.65em 0.2em 0.55em;
		border-radius: 999px;
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: capitalize;
		white-space: nowrap;
	}

	.state::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
	}

	.state-good {
		color: var(--color-status-published);
		background: var(--color-status-published-bg);
	}

	.state-plain {
		color: var(--color-status-draft);
		background: var(--color-status-draft-bg);
	}

	.state-plain::before {
		background: transparent;
		box-shadow: inset 0 0 0 1.5px currentColor;
	}

	.state-bad {
		color: var(--color-status-error);
		background: color-mix(in srgb, var(--color-status-error) 12%, transparent);
	}

	.state-bad::before {
		border-radius: 1px;
		transform: rotate(45deg);
	}

	/* Stats */
	.stats {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 1.5rem;
	}

	@media (max-width: 1023px) {
		.template-layout {
			grid-template-columns: 1fr;
			gap: 1.75rem;
		}

		.field-input {
			min-height: 44px;
		}

		.stats {
			grid-template-columns: repeat(3, 1fr);
			row-gap: 1.75rem;
		}
	}

	/* Mobile: each sent email is a stacked row, subject first */
	@media (max-width: 767px) {
		.sender-fields {
			grid-template-columns: 1fr;
		}

		.frame-page {
			height: 420px;
		}

		.logs :global(.table-wrap) {
			overflow-x: clip;
		}

		.logs :global(table),
		.logs :global(tbody) {
			display: block;
		}

		.logs :global(thead) {
			display: none;
		}

		.logs :global(tbody tr) {
			display: grid;
			grid-template-columns: 1fr auto;
			grid-template-areas:
				'subject subject'
				'to to'
				'status type'
				'sent sent';
			gap: 0.375rem 1rem;
			align-items: center;
			padding: 0.875rem 0;
			border-bottom: 1px solid var(--color-admin-border);
		}

		.logs :global(tbody tr:hover) {
			background: transparent;
		}

		.logs :global(tbody td) {
			display: block;
			padding: 0;
		}

		.c-subject {
			grid-area: subject;
			max-width: none;
		}

		.c-to {
			grid-area: to;
			font-size: var(--text-xs);
		}

		.c-status {
			grid-area: status;
		}

		.c-type {
			grid-area: type;
		}

		.c-sent {
			grid-area: sent;
		}
	}

	@media (max-width: 599px) {
		.stats {
			grid-template-columns: repeat(2, 1fr);
			gap: 1.25rem 1rem;
		}
	}
</style>
