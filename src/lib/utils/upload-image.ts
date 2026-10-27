export async function uploadImage(file: File): Promise<string> {
	const form = new FormData();
	form.append('file', file);

	const res = await fetch('/api/upload', { method: 'POST', body: form });
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || 'Upload failed');
	}

	const json = (await res.json()) as { url: string };
	return json.url;
}
