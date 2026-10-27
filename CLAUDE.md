## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, tailwindcss, sveltekit-adapter, drizzle, better-auth

---

# Open Tabs — CLAUDE.md

Master instruction file. Read before every session. No exceptions.

---

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

[Step] → verify: [check]
[Step] → verify: [check]
[Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project Overview

**Name:** Open Tabs
**Client:** IndexDaily Media
**Purpose:** Editorial blog — explainer content on business, politics, geopolitics
**Tech Stack:**

- SvelteKit (framework)
- Cloudflare Pages (hosting)
- TailwindCSS v4 (styling)
- NeonDB (PostgreSQL database)
- Drizzle ORM (database access layer)
- Better Auth (authentication)
- Cloudflare R2 (file/image storage)
- Tiptap (rich text editor)
- Resend (transactional email)
- Umami Cloud (privacy-first analytics; the only analytics. First-party tracking was removed in Session 37, and the logger writes JSON lines to the console)

**Design Source:** the open-tab redesign, built in Claude Design (project `https://claude.ai/design/p/5c07629b-a1ac-4e6b-822a-b03b32c157c2`, file `Open Tabs Redesign.dc.html`) and now implemented in code. **The code is the source of truth.** Read `src/app.css` (tokens), `docs/log.md` Sessions 32, 33 and 37 (what was built and why), and the two briefs in `docs/` (`claude-design-brief-public-pages.md`, `claude-design-brief-private-pages.md`) before touching any UI. The old `Open Tabs v2.html` files are retired.

---

## Cloudflare Pages + R2

- `wrangler.toml` at project root.
- R2 bucket binding name: `BLOG_ASSETS`.
- All secrets (DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL) go into CF Pages environment variables, NOT in wrangler.toml.
- Local dev secrets go in `.dev.vars` (gitignored). `.dev.vars.example` is committed.
- Never commit `.env` or `.dev.vars`.

---

## GitHub Actions

### `ci.yml` — runs on every PR to `main`

1. Install deps with pnpm
2. Run `pnpm check` (svelte-check + tsc)
3. Run `pnpm build`
4. Fail the PR if any step fails

### `deploy.yml` — runs on push to `main`

1. Install deps with pnpm
2. Run `pnpm check`
3. Run `pnpm build`
4. Run `pnpm db:migrate` (applies pending Drizzle migrations to Neon)
5. Deploy to CF Pages via `wrangler pages deploy`

## GH Actions Watch Protocol

After every push to main, Claude Code **must**:

1. Watch the Actions tab until the workflow completes. Dont ask for my permission to watch the actions.
2. If it fails, read the full error log.
3. Fix the root cause (not just the symptom).
4. Push the fix and watch again.
5. Only report success once the deploy workflow is green and the CF Pages URL is live.

Use `gh run watch` or poll `gh run list --limit 1` to track status.

```

## Intended Folder Structure

```

src/
lib/
components/
ui/ # Reusable primitives (button, badge, input, etc.)
blog/ # Blog-specific components (post card, author bio, etc.)
admin/ # Admin dashboard components
server/
db/ # Drizzle schema, client, queries
auth/ # Better Auth configuration and helpers
stores/ # Svelte stores (UI state, session, etc.)
utils/ # Shared pure utility functions
routes/
(public)/ # Public-facing pages (home, article, category, etc.)
(admin)/ # Admin routes (protected, editor/admin only)
docs/
.github/
workflows/
static/

````

---

## Code Quality Rules — Non-Negotiable

1. **TypeScript strict mode always on.** No `any` types. Ever. Use `unknown` + narrowing if needed.
2. **No unused imports, variables, or dead code.** ESLint catches these — fix them, don't suppress with `eslint-disable`.
3. **Every component must have proper TypeScript prop types defined.** Use `interface` or `type` for props, not inline objects.
4. **No hardcoded secrets or API keys anywhere in code.** All values via environment variables.
5. **Use Drizzle ORM for all database access.** No raw SQL except inside Drizzle's `sql` helper.
6. **Server-only code lives in `src/lib/server/` only.** Never imported in client components or `+page.svelte` directly (only `+page.server.ts` / `+server.ts`).
7. **File names: `kebab-case`.** Component names: `PascalCase`. Variables/functions: `camelCase`. Constants: `SCREAMING_SNAKE_CASE`.
8. **Import order:** SvelteKit internals → third-party → internal `$lib` → relative. ESLint import plugin enforces this.
9. **Every database schema change requires a migration file.** Run `pnpm db:generate` then `pnpm db:migrate`. Never mutate the DB directly or use `push`.
10. **R2 uploads handled server-side only** via SvelteKit form actions or API routes. Never expose R2 credentials to the client.
11. **All application entity IDs use `generateId(prefix)` from `src/lib/server/db/generate-id.ts`.** Never call `nanoid()` directly, never use `crypto.randomUUID()` for entity IDs. Format: `{prefix}_{32 base62 chars}`.

| Prefix | Entity |
|--------|--------|
| `pst`  | Post |
| `cat`  | Category |
| `tag`  | Tag |
| `aut`  | Author |
| `cmt`  | Comment |
| `rh`   | Read history |
| `sub`  | Subscriber |
| `log`  | Log event |

Better Auth-owned tables (`user`, `session`, `account`, `verification`) are exempt — do not touch their IDs.

---

## Design Fidelity Rules

The design language is the same on the public site and in the dashboard. Match it; do not invent new looks.

**The idea.** Every page is a browser tab. Paper and ink with ONE burnt-orange accent. Section headings are "ears": a dark tab on a heavy 2px rule (`SectionHead` on the public site, `SectionHeading` in the dashboard). The page you are on is the "open tab": in the masthead strip on the public site, in the sidebar in the dashboard. A story with no cover becomes a blank tab with its category name.

**Colour.** Use only the CSS variables in `src/app.css`, never hard-coded hex or rgb in components.

- Public site: `--cream` (paper), `--paper2`, `--ink`, `--ink-60`, `--accent`, `--accent-light`, `--border`.
- Dashboard: `--color-admin-*` (bg, sidebar, surface, surface-hover, border, border-strong, text, text-muted, accent, accent-light, overlay) and `--color-status-*`. Both map to the same paper, ink and accent.
- Both themes (light and dark) must work on every page. Category colours appear only as a small dot next to the name.

**Type.** Newsreader (serif) for headlines, story titles, big numbers and article text. Instrument Sans for the interface, labels and buttons. Small caps labels use wide letter spacing.

**Public site.**

- **Drop caps required** on every article body first paragraph (`::first-letter` CSS).
- **Reading progress bar** on post pages: thin (3px), accent colour, `position: fixed`, top of viewport.
- **Widths:** content 896px (`--max-w`), post cover 1100px, article text 680px (`--article-w`). Links in text use a thick 3px accent underline.
- Layout is designed for desktop (1280) and mobile (390) separately, not scaled.

**Dashboard.**

- Shared parts live in `src/lib/components/admin/` (`SectionHeading`, `AdminTable`, `StatCard`, `StatusBadge`, `EmptyState`, `FormField`, `TextInput`, `SelectInput`, `Textarea`, `Pagination`, `ConfirmModal`, `Toast`). Use them first.
- Global classes in `src/app.css` ("Dashboard kit"): `ad-btn` (ink; with `--quiet`, `--danger`, `--sm`), `ad-tabs` and `ad-tab`, `ad-toolbar`, `ad-link`, `ad-muted`, `sr-only`.
- Page title in serif on a heavy rule; thin 1px rules between rows; no cards inside cards, shadows, gradients or decorative charts.
- Tables become stacked rows on phones. Every list has empty, no-results and error states. Deleting anything uses `ConfirmModal` and names the thing being deleted.
- Authors only see their own stories; admin-only pages are listed in `hooks.server.ts`.

**Accessibility (every page).** WCAG AA contrast, nothing smaller than 12px, touch targets 44px or more, a visible focus ring, full keyboard use, status never shown by colour alone, a label on every field, errors tied to their field, and `prefers-reduced-motion` respected.

**Copy.** Plain British English. No jargon and no dashes as punctuation. The public summary box says "In brief"; TL;DR is only the internal name in the editor, database and code.

---

## Session Discipline

- Each session has a defined scope (see `docs/sessions.md`). Do not build ahead into future sessions.
- At the end of every session, update `docs/log.md` with what was built, decisions made, and anything deferred.
- If something is unclear, document the assumption in `docs/log.md` rather than guessing silently.
- Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` before declaring a session complete. All must pass with zero errors.

---

## Environment Variables

Required slots — never hardcode any of these values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | NeonDB connection string (pooled) |
| `BETTER_AUTH_SECRET` | Better Auth secret key (min 32 chars, random) |
| `BETTER_AUTH_URL` | Full public URL of the site (e.g. `https://open-tabs.pages.dev`) — used by Better Auth for CSRF and callbacks |
| `RESEND_API_KEY` | Resend email API key |
| `OPENROUTER_API_KEY` | Optional fallback only. The OpenRouter key that writes each story's TL;DR is normally pasted in Dashboard, Settings, Integrations (saved in the `settings` table), so it can change without touching Cloudflare. The models are set in `src/lib/server/tldr.ts` |
| `EXA_API_KEY` | Optional fallback only. The Exa key that writes each live story's TL;DR from its published page is normally pasted in Dashboard, Settings, Integrations (saved in the `settings` table). If Exa is not set up or fails, OpenRouter writes it |
| `R2_BUCKET` | Cloudflare R2 bucket name |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key |
| `UMAMI_WEBSITE_ID` | Umami Cloud website ID |
| `PUBLIC_SITE_URL` | Canonical site URL — public, accessible in client code |

`PUBLIC_` prefix makes a variable available in client-side SvelteKit code. All others are server-only.

---

## Key Commands

```bash
pnpm dev           # Start dev server
pnpm build         # Production build
pnpm preview       # Preview production build locally
pnpm typecheck     # Run svelte-check
pnpm lint          # Run ESLint
pnpm format        # Run Prettier
pnpm db:generate   # Generate Drizzle migration from schema changes
pnpm db:migrate    # Apply pending migrations to DB
pnpm db:studio     # Open Drizzle Studio (local DB GUI)
````
