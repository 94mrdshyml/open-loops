# Open Tabs public API (v1)

Read-only. Anyone can call it. No key, no sign-in. It only ever shows **live** stories.

Base address: `https://blog.indexdaily.in/api/v1`

## The three calls

### All stories

`GET /api/v1/stories`

Newest first, a page at a time.

| Option   | What it does                        | Default | Limit     |
| -------- | ----------------------------------- | ------- | --------- |
| `limit`  | How many stories in one page        | 20      | 1 to 50   |
| `offset` | How many stories to skip from start | 0       | 0 to 5000 |

```
curl "https://blog.indexdaily.in/api/v1/stories?limit=10&offset=20"
```

```json
{
	"stories": [{ "id": "pst_...", "slug": "...", "url": "https://...", "title": "..." }],
	"total": 106,
	"limit": 10,
	"offset": 20,
	"hasMore": true
}
```

### One story

`GET /api/v1/stories/{id}`

The id is the `id` you get from the list (`pst_` followed by 32 letters or digits).

```
curl "https://blog.indexdaily.in/api/v1/stories/pst_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

```json
{
	"story": {
		"id": "pst_...",
		"title": "...",
		"contentHtml": "<p>...</p>",
		"tldr": ["..."],
		"tags": []
	}
}
```

### Stories in one topic

`GET /api/v1/categories/{slug}/stories`

The slug is the topic's address name, for example `geopolitics`. Takes the same `limit` and `offset`.

```json
{
	"category": { "name": "Geopolitics", "slug": "geopolitics", "description": "..." },
	"stories": [],
	"total": 28,
	"limit": 20,
	"offset": 0,
	"hasMore": true
}
```

A topic that exists but has no live stories gives an empty list. A topic that does not exist gives `404`.

## What a story looks like

Every story in a list (the "card"):

| Field                | Meaning                                            |
| -------------------- | -------------------------------------------------- |
| `id`                 | The story id, used for the single story call       |
| `slug`               | The story's address name                           |
| `url`                | The link to the story on the site                  |
| `title`, `subtitle`  | Headline and standfirst (`subtitle` can be `null`) |
| `coverImageUrl`      | Cover picture address, or `null`                   |
| `publishedAt`        | When it went live (ISO date and time, UTC)         |
| `readingTimeMinutes` | Minutes to read, or `null`                         |
| `category`           | `{ name, slug }` or `null`                         |
| `author`             | `{ name, slug }` or `null`                         |

The single story adds: `updatedAt`, `excerpt`, `tldr` (the "In brief" points, an empty list if none), `tags` (`[{ name, slug }]`) and `contentHtml` (the full story as HTML).

`contentHtml` is HTML written by our own editors and is sent as saved. If you show it on a page, treat it like any other HTML you embed.

## Errors

Always JSON like `{ "error": "not_found" }`.

| Status | `error`                   | When                                                                      |
| ------ | ------------------------- | ------------------------------------------------------------------------- |
| 400    | `bad_limit`, `bad_offset` | `limit` or `offset` is not a whole number in range                        |
| 400    | `bad_id`, `bad_slug`      | The id or slug is not in the right shape                                  |
| 404    | `not_found`               | No such live story or topic                                               |
| 405    |                           | Anything other than GET (there is no way to change anything)              |
| 429    | `rate_limited`            | Too many requests. The `Retry-After` header says how many seconds to wait |
| 500    | `server_error`            | Something went wrong on our side                                          |

A story that is a draft, scheduled or archived gives exactly the same `404` as an id that never existed.

## Limits and saving

- **60 requests a minute per address**, shared across all three calls.
- Cloudflare keeps each good answer for **one minute**. A repeat of the same request in that minute is served from that copy and is **not counted** against the limit. This also means a story that is unpublished can still show for up to a minute.
- Errors are never saved.

## Calling it from a web page

Other websites may call it from the browser (`Access-Control-Allow-Origin: *`, GET only). It never uses cookies or sign-in, so this is safe.

## For us

- Code: `src/routes/api/v1/`, `src/lib/server/public-api.ts` (limit, saved answers, checks, errors), `src/lib/server/queries/public-api.ts` (the chosen fields).
- Only the fields listed above leave the server. Each one is named in `queries/public-api.ts`, so a column added to a table later stays private until it is added there on purpose.
- The saved-answer step uses Cloudflare's cache. Cloudflare may ignore it on a `*.pages.dev` address (the live site has its own domain), and plain `vite dev` has no such cache. In those cases every request is simply counted, so nothing breaks.
- No keys yet. If we add them later (higher limits, partners, anything that writes), they should be stored hashed, shown once, limited per key, and revocable.
