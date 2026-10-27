# Architecture — Open Tabs

Living document. Updated each session as the system evolves.

---

## Routing Structure

```
src/routes/
  (public)/
    +layout.svelte          # Public layout: nav, footer
    +page.svelte            # Homepage — latest posts, featured
    posts/
      [slug]/
        +page.svelte        # Individual article page
        +page.server.ts     # Load post data from DB
    categories/
      +page.svelte          # All categories index
      +page.server.ts
      [slug]/
        +page.svelte        # Category filtered post list
        +page.server.ts
    search/
      +page.svelte          # Search results
      +page.server.ts
  (admin)/
    +layout.svelte          # Admin layout: sidebar, auth guard
    +layout.server.ts       # Auth check — redirect to /login if not authed
    dashboard/
      +page.svelte          # Admin dashboard overview
    posts/
      +page.svelte          # Post list
      new/
        +page.svelte        # New post editor
      [id]/
        edit/
          +page.svelte      # Edit post editor
    categories/
      +page.svelte          # Categories CRUD
    tags/
      +page.svelte          # Tags CRUD
    authors/
      +page.svelte          # Authors CRUD (slide-over)
    settings/
      +page.svelte          # Site settings (4 tabs)
    media/
      +page.svelte          # Media library (R2)
    profile/
      +page.svelte          # Reader profile (reading history, user card)
      +page.server.ts
      edit/
        +page.svelte        # Edit firstName/lastName/username/avatar
        +page.server.ts
  login/
    +page.svelte            # Login page
    +page.server.ts         # Better Auth login action + role-based redirect
  register/
    +page.svelte            # Registration (firstName/lastName/email/username/password)
    +page.server.ts         # Validates + creates user + sends welcome email
  api/
    auth/
      [...path]/
        +server.ts          # Better Auth catch-all handler
    upload/
      +server.ts            # R2 upload endpoint (server-only)
    check-username/
      +server.ts            # GET — username availability check (rate limited)
```

---

## Auth Flow (Better Auth + NeonDB)

1. User visits `/login` or `/register`
2. Submits credentials via form action → `src/routes/login/+page.server.ts` or `register/+page.server.ts`
3. Better Auth verifies/creates user in NeonDB
4. Session cookie set (HTTP-only)
5. `hooks.server.ts` runs on every request: calls `auth.api.getSession`, hydrates `locals.user` with role + custom fields; falls back to DB query for old sessions pre-migration 0006
6. Route protection in `hooks.server.ts`: `/dashboard` → redirect readers to `/profile`; admin-only routes → redirect non-admin to `/dashboard`; `/profile` → redirect unauthenticated to `/login`
7. Auth config lives in `src/lib/server/auth/index.ts` — server-only, never imported client-side
8. All auth API routes handled by `src/routes/api/auth/[...path]/+server.ts`

**Roles:** `reader` | `author` | `admin`

| Role     | Can access                                            |
| -------- | ----------------------------------------------------- |
| `reader` | Public site, `/profile`, `/profile/edit`              |
| `author` | All reader routes + `/dashboard` (own posts only)     |
| `admin`  | All routes including categories/tags/authors/settings |

**Registration flow:**

1. `/register` — firstName, lastName, email, username (regex validated, realtime availability check), password
2. Username availability: `GET /api/check-username` with 400ms debounce, rate-limited 30 req/IP/min
3. Better Auth `signUpEmail` creates user, then `db.update` sets firstName/lastName/username/role='reader'
4. Redirect to `/profile?welcome=1`

## Reader Profile & Read History

- `/profile` — user card + reading history tab + comments tab (user's own comments)
- `/profile/edit` — update firstName/lastName/username/avatarUrl; email immutable
- Read history recorded fire-and-forget on every article page load (logged-in users only)
- `readHistory` table: unique constraint `(userId, postSlug)` — upserts update `readAt`, no duplicates
- Avatar upload: file → `POST /api/upload` (R2) → auto-submit `?/updateAvatar` form action

---

## Comment System

**Model:** Flat — no threading, no replies, no parentId.

```
Post page
  └── Comment section
        ├── [Approved comments listed, oldest first]
        ├── [Comment form — logged-in users only]
        └── ["Sign in to comment" CTA — logged-out]
```

**Status lifecycle:** `pending` → `approved` | `rejected`

| Status     | Visible publicly |
| ---------- | ---------------- |
| `pending`  | No               |
| `approved` | Yes              |
| `rejected` | No               |

**Routes:**

- `GET /posts/[slug]` — loads approved comments in parallel, never delays page
- `POST /posts/[slug]?/addComment` — auth-gated; 10–1000 char body; inserts `pending`
- `GET /dashboard/comments` — admin moderation list; filter by status + search
- `POST /dashboard/comments?/approve|reject|delete` — admin-only actions

**Access control:** `/dashboard/comments` is in `ADMIN_ONLY_ROUTES` — only `admin` role can access.

**Sidebar badge:** `pendingCommentCount` loaded in `(admin)/+layout.server.ts`; shown as a small badge on Comments nav item when > 0.

**Profile tab:** Users see their own comments (all statuses) on `/profile` → Comments tab, with human-readable status labels.

---

## File Upload Flow (Cloudflare R2)

1. User selects file in Tiptap editor or media library
2. Client sends file to `POST /api/upload` (SvelteKit API route)
3. Server-side handler reads R2 credentials from env, uploads to R2 bucket
4. Returns public URL (or signed URL if private bucket)
5. URL stored in post content or media table in NeonDB
6. R2 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET`) never leave server

---

## Email Flow (Resend)

- Used for: registration welcome email, newsletter welcome email, future broadcast
- Resend SDK imported server-side only in `src/lib/server/resend.ts`
- `RESEND_API_KEY` never exposed to client
- Email templates: React Email (`src/lib/email/newsletter-welcome.tsx`)

### Newsletter Infrastructure

**User fields** (on `user` table):

- `isNewsletterSubscriber` — boolean, default false
- `newsletterSubscribedAt` — timestamp, nullable
- `newsletterSource` — `'registration' | 'subscribe_form' | 'manual' | null`
- `resendContactId` — Resend global contact ID, nullable

**Resend service** (`src/lib/server/resend.ts`):

- `syncUserToResend(user)` — creates global contact, adds to all-users segment, optionally newsletter segment + topic. Returns contactId or null.
- `updateNewsletterSubscription(contactId, subscribe)` — adds/removes newsletter segment, updates topic opt_in/opt_out.
- `updateResendContact(contactId, fields)` — syncs name changes.

**Segments / Topics** (env vars, set in Resend dashboard):

- `RESEND_SEGMENT_ALL_USERS_ID` — all registered users
- `RESEND_SEGMENT_NEWSLETTER_ID` — newsletter subscribers only
- `RESEND_TOPIC_NEWSLETTER_ID` — newsletter opt-in topic

**Subscription entry points:**

1. Registration form — optional pre-checked checkbox; `newsletterSource: 'registration'`
2. Subscribe form (`NewsletterForm.svelte`) — bottom of every post + home page; `POST /api/newsletter/subscribe`; `newsletterSource: 'subscribe_form'`
3. Profile toggle — `?/toggleNewsletter` action; `newsletterSource: 'manual'`

**Unsubscribe:** `POST /api/webhooks/resend` — verifies Resend signature; handles `contact.updated` (unsubscribed), `email.complained`, `email.bounced`. Always returns 200.

**Unsubscribe page:** `/unsubscribe` — standalone, no navbar.

**Webhook verification:** `resend.webhooks.verify({ payload, headers, webhookSecret })` — uses `RESEND_WEBHOOK_SECRET`.

---

## Analytics (Umami Cloud)

- Script tag loaded in public layout: `<script defer src="https://cloud.umami.is/script.js" data-website-id={UMAMI_WEBSITE_ID} />`
- `PUBLIC_UMAMI_WEBSITE_ID` exposed via SvelteKit `PUBLIC_` prefix (safe — website ID is not a secret)
- No cookies, GDPR-friendly, no server-side code needed
- Dashboard: cloud.umami.is

---

## Database Schema Overview

Managed via Drizzle ORM. Schema files in `src/lib/server/db/schema/`.
Migrations in `drizzle/` directory at project root.

### Tables (planned — will be created in Session 2)

**`users`** — managed by Better Auth

- `id`, `email`, `name`, `role` (`admin` | `editor`), `createdAt`

**`sessions`** — managed by Better Auth

- `id`, `userId`, `expiresAt`, `token`

**`posts`**

- `id`, `title`, `slug` (unique), `content` (Tiptap JSON), `excerpt`, `coverImage` (R2 URL), `status` (`draft` | `published`), `publishedAt`, `authorId` (FK → users), `categoryId` (FK → categories), `createdAt`, `updatedAt`

**`categories`**

- `id`, `name`, `slug` (unique), `description`

**`tags`**

- `id`, `name`, `slug` (unique)

**`posts_to_tags`** — many-to-many join

- `postId` (FK → posts), `tagId` (FK → tags)

**`media`**

- `id`, `filename`, `r2Key`, `publicUrl`, `mimeType`, `size`, `uploadedBy` (FK → users), `createdAt`

---

## Secrets Reference

### GitHub Actions Secrets (required before first deploy)

| Secret Name             | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `DATABASE_URL`          | NeonDB connection string (pooled)                 |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API token with Pages deploy permission |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID                             |
| `BETTER_AUTH_SECRET`    | Better Auth secret key                            |
| `RESEND_API_KEY`        | Resend email API key                              |
| `R2_BUCKET`             | Cloudflare R2 bucket name                         |
| `R2_ACCOUNT_ID`         | Cloudflare account ID (same as above or separate) |
| `R2_ACCESS_KEY_ID`      | R2 access key ID                                  |
| `R2_SECRET_ACCESS_KEY`  | R2 secret access key                              |
| `UMAMI_WEBSITE_ID`      | Umami Cloud website ID                            |
| `PUBLIC_SITE_URL`       | Canonical site URL                                |

### Cloudflare Pages Environment Variables

Set the same variables (minus `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`) in the Cloudflare Pages dashboard under Settings → Environment Variables, for both Production and Preview environments.

---

## Infrastructure Diagram

```
Browser
  │
  ├── GET /article/slug → Cloudflare Pages (SvelteKit SSR)
  │     └── +page.server.ts → NeonDB (Drizzle query)
  │
  ├── POST /api/upload → SvelteKit API route
  │     └── R2 SDK → Cloudflare R2
  │
  ├── POST /api/auth/* → Better Auth
  │     └── NeonDB (sessions + users tables)
  │
  └── <script> Umami → cloud.umami.is (analytics, no PII)
```

---

## Admin Layout Architecture

### Shell Structure

```
(admin)/+layout.svelte
  ├── Mobile top bar (< 768px) — hamburger + wordmark
  ├── Sidebar
  │     ├── Wordmark → /dashboard
  │     ├── Nav items (Dashboard, Posts, Categories, Tags, Authors, Settings)
  │     │     active = accent left border + lighter bg
  │     ├── View Site link (opens /, new tab)
  │     └── User section — initials avatar, name, sign-out button
  └── Content area
        ├── Content header — $pageTitle store
        └── Content body — {children}
```

### Sidebar Responsive Behavior

| Viewport | Behavior                                                                            |
| -------- | ----------------------------------------------------------------------------------- |
| ≥ 1280px | 240px wide, full labels visible                                                     |
| < 1280px | 56px icon-only (CSS only, no JS — labels hidden via `display: none`)                |
| < 768px  | Sidebar hidden; mobile top bar + hamburger → `position: fixed` drawer with backdrop |

### Admin Page Title Store

`src/lib/stores/admin-page-title.ts` exports `writable<string>('Dashboard')`.
Each admin page calls `pageTitle.set('Posts')` on mount via `onMount`.
Layout reads `$pageTitle` to render the content header h1.

### Sign-Out Flow

Form POST to `/api/auth/sign-out` (Better Auth SvelteKit handler) + `use:enhance` to:

1. Track `signingOut` state → disable button + show spinner
2. After completion: `goto('/login')` regardless of result

---

## Analytics Injection Strategy

Tracking scripts conditionally injected via `{@html}` in `(public)/+layout.svelte`'s `<svelte:head>`:

| Tracker        | Source                          | Method                         |
| -------------- | ------------------------------- | ------------------------------ |
| Umami tracking | `UMAMI_WEBSITE_ID` env var      | `<script>` tag via `{@html}`   |
| GTM            | `settings.gtm_id` DB row        | Inline snippet via `{@html}`   |
| GA4            | `settings.ga4_id` DB row        | gtag.js + config via `{@html}` |
| Meta Pixel     | `settings.meta_pixel_id` DB row | Base code via `{@html}`        |

Script strings use `'<' + '/script>'` concatenation to avoid `no-useless-escape` ESLint rule and Svelte parser confusion with literal `</script>` in source.

`PUBLIC_UMAMI_SHARE_URL` (separate from `UMAMI_WEBSITE_ID`) is the Umami share dashboard URL — used only for the admin dashboard `<iframe>` embed, not for tracking.

---

## Query Layer

Server-only functions in `src/lib/server/queries/`. Called only from `+page.server.ts` or `+server.ts` files.

### `src/lib/server/queries/posts.ts`

| Function                                                              | Description                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `getFeaturedPost(categorySlug?)`                                      | Most recent published post, optionally filtered by category                                |
| `getPosts({ categorySlug?, limit?, offset? })`                        | Published posts, newest first, with pagination                                             |
| `getPostBySlug(slug)`                                                 | Full post with tags (2 queries); returns `PostDetail \| null`                              |
| `getRelatedPosts(postId, categoryId, limit=3)`                        | Same-category posts first, backfills from all categories if needed                         |
| `getCategories()`                                                     | Categories with `postCount > 0`, ordered by count desc                                     |
| `getPostCount({ categorySlug? })`                                     | Total published post count, optional category filter                                       |
| `getCategoryBySlug(slug)`                                             | Single category row with published post count; null if not found                           |
| `getAdminPosts({ status?, categorySlug?, search?, limit?, offset? })` | All posts (all statuses) for admin view; optional filters; `{ posts: AdminPost[], total }` |
| `getAdminPostById(id)`                                                | Full post row + tags (with `createdAt`) for editor; returns `AdminPostDetail \| null`      |
| `createPost(data)`                                                    | Insert new post with `generateId('pst')` ID; returns `postId`                              |
| `updatePost(id, data)`                                                | Partial update; sets `updatedAt: new Date()`                                               |
| `upsertPostTags(postId, tagIds)`                                      | Delete all existing tags for post, then insert new set                                     |

### `src/lib/server/queries/dashboard.ts`

| Function              | Description                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `getDashboardStats()` | 9 parallel DB queries: post counts by status, category/tag/author counts, recent 5, top 5 published |

### `src/lib/server/queries/search.ts`

| Function                       | Description                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `searchPosts(query, limit=20)` | `ilike` OR across `title`, `subtitle`, `excerpt`; returns empty array if < 2 chars |

### `src/lib/server/queries/tags.ts`

| Function          | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `getAllTags()`    | All tags sorted by name                                |
| `upsertTag(name)` | Find by slug or insert; returns `Tag` with `createdAt` |

### `src/lib/server/queries/authors.ts`

| Function          | Description                       |
| ----------------- | --------------------------------- |
| `getAllAuthors()` | All authors sorted by displayName |

### `src/lib/server/queries/settings.ts`

| Function        | Description                                           |
| --------------- | ----------------------------------------------------- |
| `getSettings()` | All settings rows, returned as `SiteSettings \| null` |

All return types defined in `src/lib/types/index.ts` (`PostListItem`, `PostDetail`, `CategoryWithCount`, `SiteSettings`, `AdminPost`).

Implementation: flat `db.select()` with `listSelect` shape constant + `toListItem()` transform. LEFT JOIN on categories and authors; WHERE on `posts.status = 'published'` for public queries; no status filter for admin queries.

---

## Post Page Data Flow

```
GET /posts/[slug]
  │
  ├── +page.server.ts
  │     ├── getPostBySlug(slug)  →  404 if null
  │     ├── getRelatedPosts(post.id, post.categoryId)  ─┐
  │     └── getSettings()                               ─┴── Promise.all
  │
  │   Returns: { post: PostDetail, relatedPosts, siteUrl, seo }
  │
  └── +page.svelte
        ├── <svelte:head>  → title, description, canonical, OG, Twitter, JSON-LD Article
        ├── ReadingProgressBar  ← bound to articleEl
        ├── CategoryPill + h1 + subtitle + AuthorCard(inline) + AuthorByline
        ├── cover image (16:9, eager, fetchpriority=high)
        ├── PostContent(content)  →  Tiptap generateHTML  →  .prose.prose-drop-cap
        ├── TagChip[] + SocialShare
        ├── AuthorCard(full)
        └── related SmallCard × 3
```

**Canonical URL:** Built from `url.origin` in `+page.server.ts` — no PUBLIC_SITE_URL env var required locally; Cloudflare sets origin correctly in production.

**JSON-LD:** Article schema with headline, description, image, dates, author, publisher (url = siteUrl passed from server).

**SEO fallback chain:**

- `ogImage`: `post.coverImageUrl` → `settings.og_image_url` → null
- `description`: `post.excerpt` → `post.subtitle` → empty string

---

## Admin CRUD Pattern

All admin management pages follow one of two patterns:

### Slide-over panel (Authors)

Used when the editable entity has multiple fields that won't fit a table row.

- Table row: display only + Edit/Delete action buttons
- Edit/Delete buttons: open right-side panel (`position: fixed`, animated slide-in)
- Form inside panel: `use:enhance` → invalidateAll on success, toast on result
- Delete: `<ConfirmModal>` → `deleteFormEl.requestSubmit()` on confirm

### Inline row editing (Categories, Tags)

Used when the editable fields are short enough to fit inline.

- Table row in display mode → clicking Edit transforms it into an editable `<tr>`
- Inline form: `use:enhance` → invalidateAll on success, editingId reset
- Save/Cancel icon buttons replace Edit/Delete while row is in edit mode
- Add new: a synthetic editable row is prepended to the table

### Shared delete pattern (all pages)

Hidden `<form bind:this={deleteFormEl}>` with `use:enhance` in the DOM. `<ConfirmModal onConfirm>` calls `deleteFormEl.requestSubmit()` — keeps SvelteKit form handling (no raw fetch).

---

## Toast System

`src/lib/stores/toast.ts` — `toast.success/error/info(msg)`. Auto-removes after 4000ms.
`src/lib/components/admin/Toast.svelte` — mounted once in `(admin)/+layout.svelte`.

---

## Settings Architecture

Settings stored as key-value rows in `settings` table (`key`, `value`, `updatedAt`). `getSettings()` returns `SiteSettings` object via `Object.fromEntries`. `updateSettings(data)` upserts only provided keys. Four separate form actions for four settings tabs — partial saves without data loss.

Tab state persisted in URL hash (`#general`, `#integrations`, `#seo`, `#email`).

---

## Logging

`logger.info`, `logger.warn` and `logger.error` (`src/lib/server/logger.ts`) write one JSON line each to the console, which Cloudflare keeps in its logs. There is no log database and no first-party analytics: the Tinybird setup, the Analytics page, the Logs page and `/api/track` were removed in Session 36. Reader analytics live in Umami Cloud, and the dashboard menu links to the saved Umami share page.

---

## ID Convention

All application entity IDs use Stripe-style `{prefix}_{32 base62 chars}` format. Generated via `generateId(prefix)` from `src/lib/server/db/generate-id.ts`. Never call `nanoid()` directly anywhere in the codebase — import from `generate-id.ts` instead.

| Prefix | Entity       | Example        |
| ------ | ------------ | -------------- |
| `pst`  | Post         | `pst_A3kZ9...` |
| `cat`  | Category     | `cat_X7mQ2...` |
| `tag`  | Tag          | `tag_nR4Lp...` |
| `aut`  | Author       | `aut_Bj8Yd...` |
| `cmt`  | Comment      | `cmt_Wf1Ks...` |
| `rh`   | Read history | `rh_Ec5Tv...`  |
| `sub`  | Subscriber   | `sub_Gh2Mn...` |
| `log`  | Log event    | `log_Pz6Ux...` |

Better Auth tables (`user`, `session`, `account`, `verification`) are exempt — IDs managed by the library.

---

## Change Log

| Session | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0       | Document created — all content is planned/expected, not yet implemented                                                                                                                                                                                                                                                                                                                                                                               |
| 2       | Auth flow, DB schema, and secrets reference implemented and verified                                                                                                                                                                                                                                                                                                                                                                                  |
| 3       | Query layer added (`src/lib/server/queries/`); home page built with real data; SEO head added                                                                                                                                                                                                                                                                                                                                                         |
| 5       | Post page data flow added; `getRelatedPosts` + `getSettings` documented; lazy Proxy pattern for `db` and `auth` explained                                                                                                                                                                                                                                                                                                                             |
| 6       | Search query (`search.ts`), `getCategoryBySlug`, category pages, search page, sitemap/robots added; Navbar/Footer updated                                                                                                                                                                                                                                                                                                                             |
| 7       | Admin layout shell, dashboard home, All Posts page; `analytics.ts` + `getAdminPosts`; page title store; status badge vars; analytics injection in public layout                                                                                                                                                                                                                                                                                       |
| 7       | Post editor: Tiptap + 6 admin components + R2 upload API + new/edit routes; `tags.ts` + `authors.ts` queries; `getAdminPostById` + `createPost` + `updatePost`                                                                                                                                                                                                                                                                                        |
| 8       | Admin CRUD pages (Authors/Categories/Tags/Settings); toast system; ConfirmModal; FormField/TextInput/Textarea/SelectInput/ColorPicker; Resend test email; schema migration for nullable userId + role + updatedAt                                                                                                                                                                                                                                     |
| 9.5     | Structured logging: `logs` table + migration; `logger.ts`; `instrument-action.ts`; all API routes + form actions + slow DB queries instrumented; `/dashboard/logs` viewer with filters + expandable rows + auto-refresh                                                                                                                                                                                                                               |
| 9       | Scheduled publisher (`publishScheduledPosts` + `/api/cron/publish`; since Session 54 page visits also run it, see `scheduled-publish.ts`); Cloudflare image optimisation (`image-url.ts`) applied to all public image components; `prefers-reduced-motion` CSS; error boundaries on all public loads; SEO meta completeness; `_headers`/`_redirects` CF config; reading-time recalculation script                                                     |
| 13      | ID standardisation: `generate-id.ts` utility, all entity IDs → `{prefix}_{32 base62}`, seed rewritten with slug-based conflict targets, CLAUDE.md rule 11 added                                                                                                                                                                                                                                                                                       |
| 10      | Full Tinybird migration: `logs` table dropped (migration 0005); all logging + analytics now via Tinybird HTTP API; 15 pipe definitions version-controlled in `tinybird/`; `logger.ts` + `tinybird.ts` rewritten; `queries/logs.ts` + `queries/analytics.ts` rewired; `hooks.server.ts` pageview logging with `waitUntil`; `/api/track` + `track.ts` client-side event tracking; `/dashboard/analytics` with pure SVG charts; Analytics nav link added |
