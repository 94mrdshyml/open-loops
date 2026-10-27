<script lang="ts">
	import { onMount } from 'svelte';
	import { pageTitle } from '$lib/stores/admin-page-title';
	import SectionHeading from '$lib/components/admin/SectionHeading.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { send, resendData } = data;

	onMount(() => pageTitle.set(send.subject));

	const EVENT_ORDER = ['sent', 'delivered', 'opened', 'clicked'] as const;
	function eventReached(step: (typeof EVENT_ORDER)[number]): boolean {
		const last = (resendData?.last_event ?? send.lastEvent ?? '') as string;
		if (last === 'bounced' || last === 'failed' || last === 'complained') return false;
		const idx = EVENT_ORDER.indexOf(step);
		const lastIdx = EVENT_ORDER.indexOf(last as (typeof EVENT_ORDER)[number]);
		return lastIdx >= idx;
	}

	const isBounced =
		send.lastEvent === 'bounced' || send.lastEvent === 'failed' || send.lastEvent === 'complained';

	function formatDate(d: Date | string | null | undefined): string {
		if (!d) return '—';
		return new Date(d).toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function typeLabel(type: string): string {
		return type === 'newsletter_welcome' ? 'Newsletter welcome' : 'Registration welcome';
	}

	function tone(event: string | null | undefined): 'good' | 'bad' | 'plain' {
		if (event === 'delivered' || event === 'opened' || event === 'clicked') return 'good';
		if (event === 'bounced' || event === 'failed' || event === 'complained') return 'bad';
		return 'plain';
	}

	const currentEvent = resendData?.last_event ?? send.lastEvent;

	const rawDb = JSON.stringify(
		{
			id: send.id,
			resendEmailId: send.resendEmailId,
			type: send.type,
			toEmail: send.toEmail,
			userId: send.userId,
			subject: send.subject,
			lastEvent: send.lastEvent,
			sentAt: send.sentAt,
			updatedAt: send.updatedAt
		},
		null,
		2
	);

	const rawResend = resendData
		? JSON.stringify(
				{
					id: resendData.id,
					from: resendData.from,
					to: resendData.to,
					subject: resendData.subject,
					last_event: resendData.last_event,
					created_at: resendData.created_at,
					scheduled_at: resendData.scheduled_at
				},
				null,
				2
			)
		: null;
</script>

<div class="detail-page">
	<a href="/dashboard/emails" class="back">← All emails</a>

	<section>
		<SectionHeading label="Delivery" />
		{#if isBounced}
			<ol class="steps">
				<li class="step step-done">
					<span class="mark" aria-hidden="true"></span>
					<span class="step-label">Sent</span>
					<span class="step-time">{formatDate(send.sentAt)}</span>
				</li>
				<li class="step step-bad">
					<span class="mark" aria-hidden="true"></span>
					<span class="step-label">
						{send.lastEvent === 'complained'
							? 'Marked as spam'
							: send.lastEvent === 'failed'
								? 'Failed'
								: 'Bounced'}
					</span>
					<span class="step-time">{formatDate(send.updatedAt)}</span>
				</li>
			</ol>
		{:else}
			<ol class="steps">
				{#each EVENT_ORDER as step (step)}
					{@const reached = step === 'sent' ? true : eventReached(step)}
					<li class="step" class:step-done={reached}>
						<span class="mark" aria-hidden="true"></span>
						<span class="step-label">{step.charAt(0).toUpperCase() + step.slice(1)}</span>
						<span class="step-time">
							{#if reached}
								{formatDate(step === 'sent' ? send.sentAt : send.updatedAt)}
							{:else}
								Not yet
							{/if}
						</span>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<section>
		<SectionHeading label="Details" />
		<dl class="facts">
			<div>
				<dt>To</dt>
				<dd>{send.toEmail}</dd>
			</div>
			{#if resendData?.from}
				<div>
					<dt>From</dt>
					<dd>{resendData.from}</dd>
				</div>
			{/if}
			<div>
				<dt>Subject</dt>
				<dd>{send.subject}</dd>
			</div>
			<div>
				<dt>Type</dt>
				<dd><span class="type">{typeLabel(send.type)}</span></dd>
			</div>
			<div>
				<dt>Status</dt>
				<dd>
					<span class="state state-{tone(currentEvent)}">{currentEvent ?? 'sent'}</span>
				</dd>
			</div>
			<div>
				<dt>Sent at</dt>
				<dd>{formatDate(send.sentAt)}</dd>
			</div>
			<div>
				<dt>Last updated</dt>
				<dd>{formatDate(send.updatedAt)}</dd>
			</div>
			{#if send.resendEmailId}
				<div>
					<dt>Resend ID</dt>
					<dd class="mono">{send.resendEmailId}</dd>
				</div>
			{/if}
			{#if send.userId}
				<div>
					<dt>User ID</dt>
					<dd class="mono">{send.userId}</dd>
				</div>
			{/if}
		</dl>
	</section>

	{#if resendData?.html}
		<section>
			<SectionHeading label="Email preview" />
			<!-- The email keeps its own colours. Only the frame around it follows the theme. -->
			<div class="frame">
				<iframe
					title="Preview of the email as sent"
					srcdoc={resendData.html}
					class="frame-page"
					sandbox="allow-same-origin"
				></iframe>
			</div>
			<p class="note">Shown on a light page, as most mail apps show it, in both themes.</p>
		</section>
	{/if}

	<section>
		<SectionHeading label="Raw data" />
		<details class="raw">
			<summary>Database record</summary>
			<div
				class="raw-pre"
				tabindex="0"
				role="textbox"
				aria-readonly="true"
				aria-multiline="true"
				aria-label="Database record"
			>
				{rawDb}
			</div>
		</details>
		{#if rawResend}
			<details class="raw">
				<summary>Resend record</summary>
				<div
					class="raw-pre"
					tabindex="0"
					role="textbox"
					aria-readonly="true"
					aria-multiline="true"
					aria-label="Resend record"
				>
					{rawResend}
				</div>
			</details>
		{/if}
	</section>
</div>

<style>
	.detail-page {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
		max-width: 800px;
	}

	.back {
		display: inline-flex;
		align-items: center;
		align-self: flex-start;
		min-height: 44px;
		margin-bottom: -1.5rem;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text-muted);
		text-decoration: none;
	}

	.back:hover {
		color: var(--color-admin-accent);
	}

	/* Delivery steps: a label and a time for each, with a marker that backs up the words */
	.steps {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.step {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding-top: 0.875rem;
		border-top: 2px solid var(--color-admin-border-strong);
		color: var(--color-admin-text-muted);
	}

	.step-done {
		border-top-color: var(--color-admin-text);
		color: var(--color-admin-text);
	}

	.step-bad {
		border-top-color: var(--color-status-error);
	}

	.mark {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1.5px currentColor;
	}

	.step-done .mark {
		background: currentColor;
	}

	.step-bad .mark {
		border-radius: 1px;
		background: var(--color-status-error);
		box-shadow: none;
		transform: rotate(45deg);
	}

	.step-label {
		font-family: var(--serif);
		font-size: 1.25rem;
		font-weight: 500;
		line-height: 1.2;
	}

	.step-bad .step-label {
		color: var(--color-status-error);
	}

	.step-time {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}

	/* Details */
	.facts {
		margin: 0;
		border-top: 1px solid var(--color-admin-border);
	}

	.facts > div {
		display: grid;
		grid-template-columns: 8rem 1fr;
		gap: 0.75rem;
		align-items: center;
		min-height: 44px;
		padding: 0.25rem 0;
		border-bottom: 1px solid var(--color-admin-border);
	}

	dt {
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: var(--tracking-caps);
		text-transform: uppercase;
		color: var(--color-admin-text-muted);
	}

	dd {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--color-admin-text);
		overflow-wrap: anywhere;
	}

	.mono {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
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

	/* Preview */
	.frame {
		padding: 0.75rem;
		background: var(--color-admin-surface-hover);
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
	}

	.frame-page {
		display: block;
		width: 100%;
		height: 520px;
		border: 0;
		border-radius: 4px;
		color-scheme: light;
	}

	.note {
		margin: 0.5rem 0 0;
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}

	/* Raw data */
	.raw {
		border-bottom: 1px solid var(--color-admin-border);
	}

	.raw:first-of-type {
		border-top: 1px solid var(--color-admin-border);
	}

	.raw summary {
		display: flex;
		align-items: center;
		min-height: 44px;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
		cursor: pointer;
	}

	.raw summary:hover {
		color: var(--color-admin-accent);
	}

	.raw-pre {
		margin: 0 0 1rem;
		padding: 0.75rem 1rem;
		background: var(--color-admin-surface);
		border: 1px solid var(--color-admin-border);
		border-radius: 8px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		line-height: 1.6;
		color: var(--color-admin-text);
		overflow-x: auto;
		white-space: pre;
	}

	@media (max-width: 599px) {
		.steps {
			grid-auto-flow: row;
			gap: 0.75rem;
		}

		.step {
			display: grid;
			grid-template-columns: auto 1fr;
			align-items: center;
			column-gap: 0.75rem;
		}

		.step-time {
			grid-column: 2;
		}

		.facts > div {
			grid-template-columns: 6.5rem 1fr;
		}

		.frame-page {
			height: 420px;
		}
	}
</style>
