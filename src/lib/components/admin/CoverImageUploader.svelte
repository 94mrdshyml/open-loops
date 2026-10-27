<script lang="ts">
	import { uploadImage } from '$lib/utils/upload-image';

	interface Props {
		value: string | null;
		onchange?: (url: string | null) => void;
	}

	let { value = $bindable(null), onchange }: Props = $props();

	let dragging = $state(false);
	let uploading = $state(false);
	let error = $state('');

	async function handleFile(file: File) {
		if (!file.type.startsWith('image/')) {
			error = 'Only image files allowed';
			return;
		}
		error = '';
		uploading = true;
		try {
			const url = await uploadImage(file);
			value = url;
			onchange?.(url);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const file = e.dataTransfer?.files[0];
		if (file) handleFile(file);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}

	function onClick() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = () => {
			const file = input.files?.[0];
			if (file) handleFile(file);
		};
		input.click();
	}

	function onPaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;
		for (const item of items) {
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) handleFile(file);
				return;
			}
		}
	}

	function remove() {
		value = null;
		onchange?.(null);
	}
</script>

<svelte:window onpaste={onPaste} />

<div class="uploader">
	{#if value}
		<div class="preview">
			<img src={value} alt="Cover" />
		</div>
		<div class="preview-actions">
			<button type="button" class="ad-btn ad-btn--quiet ad-btn--sm" onclick={remove}>
				Remove cover image
			</button>
		</div>
	{:else}
		<button
			type="button"
			class="dropzone"
			class:dragging
			class:uploading
			onclick={onClick}
			ondrop={onDrop}
			ondragover={onDragOver}
			ondragleave={() => (dragging = false)}
			aria-busy={uploading}
		>
			{#if uploading}
				<span class="spinner" aria-hidden="true"></span>
				<span class="label" role="status">Uploading…</span>
			{:else}
				<svg
					class="icon"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M12 16V4M7 9l5-5 5 5" />
					<path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
				</svg>
				<span class="label">Drop an image, paste one, or click to upload</span>
				<span class="hint">JPG, PNG or WebP, up to 5 MB</span>
			{/if}
		</button>
	{/if}
	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}
</div>

<style>
	.uploader {
		width: 100%;
	}

	.dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 1.75rem 1rem;
		width: 100%;
		min-height: 44px;
		background: transparent;
		font-family: var(--font-sans);
		border: 2px dashed var(--color-admin-border-strong);
		border-radius: 8px;
		cursor: pointer;
		transition:
			border-color 0.15s,
			background-color 0.15s;
		text-align: center;
	}

	.dropzone:hover,
	.dropzone.dragging {
		border-color: var(--color-admin-accent);
		background: var(--color-admin-accent-light);
	}

	.dropzone.uploading {
		cursor: default;
		pointer-events: none;
	}

	.icon {
		color: var(--color-admin-text-muted);
	}

	.label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-admin-text);
	}

	.hint {
		font-size: var(--text-xs);
		color: var(--color-admin-text-muted);
	}

	.preview {
		border: 1px solid var(--color-admin-border-strong);
		border-radius: 8px;
		overflow: hidden;
		aspect-ratio: 16 / 9;
	}

	.preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.preview-actions {
		margin-top: 0.5rem;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--color-admin-border-strong);
		border-top-color: var(--color-admin-accent);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error {
		margin-top: 0.5rem;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-status-error);
	}
</style>
