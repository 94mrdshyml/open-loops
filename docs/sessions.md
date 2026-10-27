# Session Roadmap — Open Tabs

Full planned scope for Sessions 0–11. Update this file if scope changes — note the date and reason.

---

## Session 0 — Meta Infrastructure ✅

**Status:** Complete (2026-05-19)

- CLAUDE.md
- docs/ folder (log, architecture, sessions)
- GitHub Actions CI/CD pipeline
- package.json scripts
- Root config stubs (.env.example, .gitignore, README.md)

---

## Session 1 — Project Initialization

- SvelteKit project init (`pnpm create svelte@latest`)
- TailwindCSS v4 integration
- ESLint + Prettier configuration (strict TypeScript rules, import ordering)
- tsconfig.json with strict mode
- SvelteKit adapter: `@sveltejs/adapter-cloudflare`
- Placeholder routes: `(public)/+layout.svelte`, `(public)/+page.svelte`
- Verify: `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass clean

---

## Session 2 — Database Layer

- NeonDB project setup (document connection string slot)
- Drizzle ORM installation and configuration
- Full schema definition: `users`, `sessions`, `posts`, `categories`, `tags`, `posts_to_tags`, `media`
- Initial migration generated and applied
- Drizzle client configured with NeonDB serverless driver
- Seed script for dev: creates one admin user, two categories, two sample posts
- Verify: `pnpm db:migrate` runs clean, `pnpm typecheck` passes

---

## Session 3 — Authentication

- Better Auth installation and configuration
- Auth schema integration with Drizzle (users + sessions tables)
- Login page (`/login`) — form, validation, error states
- Logout action
- Admin layout auth guard (`(admin)/+layout.server.ts`)
- Session cookie: HTTP-only, secure, SameSite=Strict
- Role-based access: `admin` vs `editor` — middleware helper
- Verify: login/logout flow works end-to-end in dev

---

## Session 4 — Public Layout & Homepage

- Fetch design file, implement pixel-accurate public layout
- Navigation: logo, nav links, mobile hamburger menu
- Footer
- Homepage: featured post hero, recent posts grid, category pills
- Responsive: desktop and mobile from design file
- Font loading (design-specified fonts via `@font-face` or Google Fonts)
- Verify: layout matches design, no console errors

---

## Session 5 — Article Page

- Individual article route: `/blog/[slug]`
- Post data loading from NeonDB via Drizzle
- Article layout: headline, byline, cover image, body content
- Drop caps on first paragraph (CSS `::first-letter`)
- Reading progress bar (fixed top, accent color, 2–3px)
- Post body max width: 680px
- Estimated reading time calculation
- Category + tag display
- SEO: `<title>`, `<meta description>`, Open Graph tags per post
- Verify: article renders correctly with real DB data

---

## Session 6 — Admin Dashboard & Post List

- Admin layout with sidebar navigation
- Dashboard: stats overview (total posts, drafts, published)
- Post list: table with title, status, date, author, actions
- Delete post action with confirmation
- Category and tag management pages (CRUD)
- Verify: admin routes protected, all actions work

---

## Session 7 — Post Editor (Tiptap)

- Tiptap rich text editor integration
- Toolbar: bold, italic, headings, links, blockquote, lists, images
- Image upload: drag-drop or file picker → `/api/upload` → R2
- New post form: title, slug (auto-generated, editable), excerpt, cover image, category, tags, status (draft/publish)
- Edit post: pre-populate from DB, save updates
- Autosave to localStorage (draft recovery)
- Verify: full create/edit/publish cycle works

---

## Session 8 — Media Library

- Media upload page in admin
- R2 upload API route (`/api/upload`) — server-side only
- Media grid: thumbnails, filename, size, upload date
- Copy URL action
- Delete media (R2 + DB record)
- Verify: upload/display/delete cycle works

---

## Session 9 — Category & Tag Pages (Public)

- Category listing page: `/category/[category]`
- Tag listing page (if needed): `/tag/[tag]`
- Pagination or infinite scroll on listing pages
- Category nav in public header (dynamic, from DB)
- Verify: pages load with real data, SEO tags correct

---

## Session 10 — Tinybird Analytics Migration ✅

**Status:** Complete (2026-05-20)

- Full migration from NeonDB `logs` table to Tinybird unified event stream
- 15 Tinybird pipe definitions version-controlled in `tinybird/`
- `logger.ts` + `tinybird.ts` rewritten; `queries/logs.ts` + `queries/analytics.ts` rewired
- NeonDB `logs` table dropped via migration 0005
- `hooks.server.ts` server-side pageview logging with `waitUntil`
- `/api/track` endpoint + `track.ts` client-side event utility
- `/dashboard/analytics` page with pure SVG charts (bar, donut, country/platform bars)
- Analytics nav link added to admin sidebar

---

## Session 11 — Polish, SEO & Launch Prep

- Sitemap generation (`/sitemap.xml`)
- RSS feed (`/rss.xml`)
- robots.txt
- Full Lighthouse audit — target 90+ on all metrics
- Image optimization: WebP conversion, lazy loading, `srcset`
- Error pages: 404, 500 with on-brand design
- Umami analytics verified in production
- Final design QA against design file
- Performance audit: Core Web Vitals
- Launch checklist: all env vars set in Cloudflare Pages, DNS configured, custom domain

---

## Notes

- Scope of each session is intentionally tight — one concern per session.
- Sessions are designed to be completable in 1–3 hours each.
- If a session's scope grows, split it rather than bloating the session.
- Update this file with `(status)` and date when sessions complete or scope changes.
