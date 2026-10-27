# Build Log — Open Tabs

## Session 55: A public read-only API

**Date:** 2026-10-19
**Scope:** The owner asked for three API routes (one story by id, all stories in a category, all stories) and for advice on security and rate limiting. Decisions agreed before building: open to everyone with no key for now, other websites may call it from the browser, the list gives card details plus the id, the single story gives the full text, In brief and tags.

**What was built:**

- `GET /api/v1/stories` (all live stories, newest first), `GET /api/v1/stories/{id}` (one story), `GET /api/v1/categories/{slug}/stories` (one topic). `limit` 1 to 50 (default 20) and `offset` 0 to 5000. Lists answer `{ stories, total, limit, offset, hasMore }`; the topic call also gives `category { name, slug, description }`.
- `src/lib/server/queries/public-api.ts`: the chosen fields, named one by one (no whole rows go out). Card: id, slug, url, title, subtitle, coverImageUrl, publishedAt, readingTimeMinutes, category { name, slug }, author { name, slug }. Single story adds updatedAt, excerpt, tldr (empty list if none), tags and contentHtml. The `url` uses `PUBLIC_SITE_URL`. Only `status = published` is ever read.
- `src/lib/server/public-api.ts`: input checks (story id must be `pst_` plus 32 letters or digits, topic slug `a-z 0-9 -` up to 100, limit and offset as above; bad input is a 400 before the database is touched), errors as `{ error }` with `no-store`, CORS open for GET (`*`, no credentials, an OPTIONS answer), and `serveApi`.
- `serveApi` order: a saved answer from Cloudflare's cache first (free, not counted); otherwise the rate limit (the existing database counter, 60 a minute per address, one shared bucket `api:<address>`, a 429 with `Retry-After`); then the real work. Good (200) answers are saved for 60 seconds. The saved copy is keyed on the cleaned-up question, so extra junk in the address cannot dodge it. Errors are never saved.
- `src/app.d.ts`: `platform.caches` typed as `CacheStorage & { default: Cache }`, as in the SvelteKit adapter docs.
- `docs/api.md`: how to use it, the fields, the errors, the limits.

**Decisions:**

- A draft, scheduled or archived story answers exactly like an id that never existed (same 404 body), so nobody can tell what is coming.
- Story ids are 32 random characters, so they cannot be guessed. The list is how callers find ids.
- No keys, no writing. If keys are added later: stored hashed, shown once, limited per key, revocable (noted in `docs/api.md`).
- Because answers are saved for a minute, an unpublished story can still show for up to a minute.
- The limit is by address, so offices and phone networks share one. A person with many addresses can still go faster. The stories are public anyway; the aim is to protect the database and the bill.
- Not built: filtering by tag or author, a changed-since option, a Cloudflare dashboard rule in front. The last is the strongest wall against a flood and can be added in the Cloudflare dashboard (WAF, rate limiting rules).

**Checked** (copy of the live data, 60 checks, all pass): list total equals the database (106) and walking every page at 50 gives every live story exactly once; drafts, scheduled and archived stories never appear anywhere and their 404 body is identical to a made-up id; the fields are exactly the chosen ones and no email, user id or status appears; bad limit, offset, id and slug (including `pst_'; drop table posts;--`, upper case, too long, path tricks) all give 400; unknown topic gives 404; paging and ordering for a topic match the database; CORS on good answers, 400s and 404s, an OPTIONS answer, no cookies, POST, PUT, PATCH and DELETE give 405, a bogus session cookie changes nothing; 65 different requests gave 60 answers and 5 429s with `Retry-After`. In Cloudflare's own local runtime (built site, `wrangler pages dev`): the same request five times reached the database once, junk added to the address still used the saved copy, 100 repeats were never refused, a 404 was not saved (a draft then published gave 404 then 200), and the saved copy keeps its CORS header. `pnpm typecheck` 0 errors, lint and Prettier clean on the new files, `pnpm build` passes.

**Not done:** nothing was tested on the live site yet. The saved-answer step needs the live domain to prove itself (it was proven in Cloudflare's local runtime, not on the internet).

---

## Session 54: Scheduled stories now publish themselves

**Date:** 2026-10-19
**Scope:** The owner scheduled two stories for 22:30 and 22:33 (India time). The time passed and both still said "Scheduled". Find the cause and fix it. Chosen fix: the site checks for itself, instead of a new Worker or an outside timer.

**Cause:** the code that publishes due stories (`publishScheduledPosts`, called by `/api/cron/publish`) was fine, and the live site had its `CRON_SECRET` set. But nothing ever called that address. There is no timer in `.github/workflows`, and Cloudflare Pages cannot run timers. Session 10 had listed "the actual timer" as still to do and it was never added. Scheduled stories had never published by themselves before; these two were the first to wait on it. Checked on the live database: both rows were correctly saved as `scheduled` with `published_at` 17:00 and 17:03 UTC.

**What was built:**

- `publishScheduledPosts` now claims the due stories in one `UPDATE ... RETURNING` statement. Before, it looked them up and then updated them in two steps, so two checks at the same moment could both announce the same story.
- New `src/lib/server/scheduled-publish.ts`. `publishDueStories` is the shared routine (claim, write TL;DRs for up to 3, tell IndexNow); `/api/cron/publish` now calls it, so the old address behaves as before and an outside timer can still be added. `checkDueStoriesSoon` runs it on page visits.
- `src/hooks.server.ts`: a new handle, run before the sign-in one, starts the check on every GET (except the cron address itself) and does not wait for it. A running copy of the site checks at most once a minute (a plain timestamp in memory, so no new table). A failed check is written to the log as `scheduled.check.failed` and never touches the page. Cloudflare runs several copies, so a few extra checks can happen; the claim makes them harmless.
- "Overdue" warning: `StatusBadge` takes an `overdue` flag and shows the word "Overdue" (with the same diamond marker, in the error colours) for a scheduled story whose time has passed. Used in the Posts list, the dashboard's Recent stories, and the editor's Publish panel (and its bottom bar on phones). The panel's hint then reads "This story was due on ... and is not live yet. It should go live within a minute. Reload to check, or publish now." The small test lives in `src/lib/utils/schedule.ts` (`isOverdue`). The editor panel re-checks every 30 seconds while it is open.
- `docs/architecture.md` row for the publisher updated.

**Decisions:**

- One minute, not 30. The check is one cheap statement, so a longer gap only made stories later.
- Not changed: the editor panel still shows only the date of a scheduled story, not the time. Worth adding, but showing a time from the server's clock before the page loads could briefly show the wrong zone, so it needs its own look.

**Limit:** the check only runs when someone visits the site or opens the dashboard. On a site with steady traffic that is within a minute or two of the set time. If it ever sits idle, a story waits for the next visit. An outside timer calling `/api/cron/publish` (needs `CRON_SECRET`) would close that gap.

**Checked** (copy of the live data, local server): one visit published both overdue stories; with the story overdue again, 20 visits at once caused no new check and the next visit after a minute published it; two and six calls to `/api/cron/publish` at the same moment published the story exactly once (counts 0 and 1); the cron address still answers 401 without the password; with publishing made to fail on purpose, the page still loaded (200), the failure was logged, and the next visit after the fault was removed published the story; the Overdue label shows in the list, the dashboard, the editor (light and dark) and the phone bar. `pnpm typecheck` 0 errors, lint clean on the changed files, `pnpm build` passes.

**Not done:** nothing was tested on the live site yet. The first real proof is the next scheduled story after deploy. `prettier --check` still flags two older files I did not touch (`dashboard/emails/+page.server.ts`, `api/email-preview/+server.ts`).

**Side note:** the test machine has an OpenRouter key of its own, so the first test visit made one real TL;DR request (it came back with an error from the provider, nothing was written). It was switched off for the later tests.

---

## Session 53: A tag cloud page

**Date:** 2026-10-19
**Scope:** The owner asked for a tag cloud page, linked from the footer, that looks good.

**First, the deploy of Session 52 was checked:** the deploy run for the merged search PR (run 142) passed, and on the live database the 3 new search columns exist and all stories have their plain-text copy (0 unfilled).

**What was built:**

- New page `/tags` ("Tags", kicker "Index", count of tags, the italic line "Every subject tag on Open Tabs. The bigger the word, the more stories it holds."). It follows the Topics page: page head, then section ears.
- **Tag cloud** section: the tags with 2 or more live stories (106 today), as words in the serif face, centred and wrapping. Size shows the story count in 5 steps (60, 44, 34, 26, 20px on desktop; smaller on tablet and phone, never under 17px). The steps are on a log scale between the smallest and largest count, so one very busy tag (India, 22) does not shrink the rest. Only the biggest step is in the accent colour; the next two are ink, the smallest two are the softer ink. The exact count sits beside each word in small figures, and a screen reader hears "India, 22 stories", so size and colour are never the only signal. The order is a fixed shuffle (a hash of the tag's address), so big and small words mix evenly and the cloud looks the same on every visit. Hover changes the colour only.
- **A to Z** section: every tag with a live story (345 today), including the ones with a single story, under big italic letters, in 3 columns on desktop, 2 on tablet and 1 on phones, with thin rules between rows and "3 stories" on the right. A row of letter links jumps to each letter (only letters in use; digits and symbols are under "#", listed first; accents are folded, so Édith sits under E). Each whole row is the link.
- Footer: "Tags" added to the Pages column, after Categories. The sitemap lists `/tags` (weekly, 0.5).
- New query `getPublishedTagCounts` counts only stories that are live. The older `getAllTagsWithCounts` (used by the dashboard) counts every story, drafts included, and was left alone. The tag page itself (`/tags/[slug]`) is unchanged.
- New helpers in `src/lib/utils/tag-cloud.ts` (`buildTagCloud`, `groupTagsByLetter`).

**Decisions:**

- Tags with a single story are not in the cloud (about 240 of them would turn it into dust), but they are all in A to Z, so nothing is hidden. If no tag has 2 stories the cloud section is left out and A to Z still shows.
- The cloud does not link to a "more" or filter; it is one page, no scripts needed.
- The header on the site is sticky, so letter jumps leave room under it.
- Not changed: the llms.txt file does not list the tags page.

**Checked** (copy of the live data): the page returns 200 with 106 cloud words and 345 A to Z rows; the footer link works; 1280, 768 and 390 wide, light and dark, no sideways scroll; every cloud word and every row is at least 44px tall (letters 44 by 44) and no text under 12px; a visible focus ring; a letter jump lands the letter below the sticky bar with and without reduced motion; a cloud word opens its tag page; 8 unit checks on the helpers (empty, only single story tags, equal counts, tier steps, order not depending on input order, digit and accent grouping, case blind and natural number sorting); no console errors. `pnpm typecheck` 0 errors (22 old warnings), ESLint clean, `pnpm build` passes.

**Not done:** the dark look was checked on phone and desktop screenshots by eye only at the top of the page.

---

## Session 52: A smarter search

**Date:** 2026-10-19
**Scope:** The owner asked for four upgrades to the blog search: (1) match every word on its own and look in more places, (2) put the best match first, (3) use Postgres' own full-text search, (4) fix typos. Answers to my questions: the In brief box is searchable; a typo fix is shown as "Showing results for Adani"; 20 results at a time with a Load more button; extra database features may be switched on, as long as there is a database copy to go back to.

**What the search did before:** the whole typed text had to appear, as one exact phrase, in the title, subtitle or excerpt (a case-blind `ILIKE`). "bank idbi" found nothing even though "IDBI Bank" exists; the story text, In brief, tags, topic and author were never looked at; results were simply newest first with no limit shown or Load more.

**What changed:**

- Every word is matched on its own, in any order, with endings ignored (bank, banks, banking). Quotes make an exact phrase, a minus leaves a word out, OR means either (`websearch_to_tsquery`). Accents are ignored (cafe finds café).
- Searched places: title, subtitle, excerpt, the story text, the In brief points, the tags, the topic name and the author's public name (the name readers see, not the account name).
- Ranking: a title match counts most, then subtitle, then excerpt and In brief, then the story text; tags, topic and author add a little. Ties go to the newest story. A phrase in the title gets a small extra push.
- Typos: only when a search finds nothing. A typed word (4 or more letters, plain letters only) that is not a word on the site is swapped for the closest word that is (one slip for 4 letters, two for 5 or more; two neighbouring letters swapped counts as one slip, so adnai gives Adani; ties go to the word used in more stories). The page says "Showing results for adani. Search instead for adnai", and that link runs the exact text with `?exact=1`. Quoted words, minus words and OR are never touched.
- Results come 20 at a time. Load more fetches the next 20 (`/api/search`) and moves focus to the first new story with a "20 more stories loaded" announcement; without JavaScript the same button reloads the page with `?shown=2, 3, ...` (up to 10 batches). The batch size is fixed on the server. Searches and Load more share one limit of 60 a minute per visitor (counted in the database); past it the page says "Too many searches".
- Data: migration `0019_search_vectors` turns on the `unaccent` and `fuzzystrmatch` extensions, adds two small helper functions, and adds three columns on `posts`: `search_body` (a plain-text copy of the story, written every time a story is created or saved) and two generated columns (`search_vector` with weights, `search_words` for typo checking). `scripts/migrate.ts` fills `search_body` for existing stories right after the migrations (only where empty, safe to run again, does not touch `updated_at`). The text conversion moved from `tldr.ts` to `article-text.ts` so the migration script can share it.

**Decisions:**

- `fuzzystrmatch` (letter distance) and not `pg_trgm`: trigram scoring rated adnai against adani too low to ever suggest it.
- No search index yet. Tags, topic and author are added to the searchable text while searching (so nothing has to be copied around when they are renamed), which a plain index cannot cover. Fine at this size (about 100 stories, a search takes 0.15 to 0.5 seconds on the free database); revisit if the site grows past a few thousand stories.
- Stemming does not link different words (storage and store). Meaning-based search is left for later.
- Typo fixing never runs when something was found, so a real but rare word is never replaced.

**Backup before the database change:** the free Neon plan allows only one snapshot and it was already used, so a full copy of the live database was made as a branch instead ("do not delete" in its name, made 2026-10-19 09:30 UTC, nothing is using it so it costs nothing). The change only adds things, so the normal way back is to revert the pull request; the backup is for a bad surprise.

**Checked** (copy of the live data): migration applied cleanly (extensions install, 97 stories filled, run again changes nothing); word order, endings, body-only words, In brief only words (a test word added to one In brief was found, then removed), tags, topic, author public name, quotes, minus, OR, accents, only filler words, one letter, empty, `%`, `_`, quote marks and a SQL line (all safe); typos (adnai, idbbi, netanyhu, wastewatr, privatisaton, a two word search with one wrong word; a nonsense word finds nothing and shows "No stories found"); Load more through 20, 40, 60, 69 stories with no repeats, the button gone at the end, focus and announcement, without JavaScript too; API refuses bad offsets (400); the limit answers 429 after 60; editing a story in the dashboard updates the searchable text straight away; 390 wide has no sideways scroll. `pnpm typecheck` 0 errors (22 old warnings), ESLint clean, `pnpm build` passes.

**Not done:** the dark-mode look of the new notice was not checked by eye (it uses the same colours as the page's other text and links).

---

## Session 51: A short description under each category title

**Date:** 2026-10-18
**Scope:** The owner wanted a one or two line description on every category page.

**What was found:** the `categories` table already had a `description` column, but nothing showed it and the dashboard had no box for it. The category page's search description was a fixed sentence ("Explore all stories filed under ...").

**What changed:**

- Category page (`categories/[slug]`): the description sits under the title in the page head's italic line (the `dek`). With no description there is no gap. The same text is now the page's search and sharing description; with none, the old sentence is used.
- Dashboard, Categories, add or edit: new "Short description" box (up to 200 characters, with a counter). The server trims it, folds line breaks and runs of spaces into single spaces, cuts it at 200 and saves nothing when it is empty. It is shown as plain text, so a `<b>` typed in it appears as typed and cannot become markup.
- Data: migration `0018_category-descriptions` writes a first draft for the 9 existing categories (geopolitics, business, india, economy, defence, artificial-intelligence, science-tech, startups, renewable-energy), only where the description is empty or blank, so anything written in the dashboard is never overwritten. The lines are plain British English in the site's "who pays" voice, 82 to 99 characters. They are drafts for the owner to rewrite in Dashboard, Categories.
- Not changed: the Topics index page (`/categories`) does not show the lines.

**Checked** (copy of the live data): 33 checks, none failing. The migration moved the log from 18 to 19 and filled all 9; all 9 category pages show their own line right after the single h1 and use it as the search and sharing description; replaying the migration kept a hand-written line, filled a null one and a blank one; the dashboard box starts with the saved line, stops at 200 characters, saves with spaces tidied, shows `<b>` as text (not in the raw page source either), clearing it removes the line and the gap and restores the old search description; a direct 400 character post was cut to 200; a new category saved with and without a line, and its page showed or hid the line accordingly; the line takes 2 lines at 1280 and 390 wide and 1 at 768, with no sideways scroll. `pnpm typecheck` 0 errors (22 old warnings), ESLint clean, `pnpm build` passes.

---

## Session 50: Exa writes the In brief points from the live story

**Date:** 2026-10-17
**Scope:** The owner wanted to try Exa instead of the free OpenRouter models for the TL;DR ("In brief") points. Research first: Exa and Parallel are web search and research services, not plain "summarise this text" tools. Exa's page summary takes a web address, not text, so it only works on a story that is already live. The owner's idea (publish, wait until it is live, send Exa the address, ask for 4 points) fits that. The owner tried it by hand in Exa's playground; one reply passed every rule, another (one-line prompt) did not, so the build checks every reply and keeps OpenRouter as the backup.

**How it works now (`tldr.ts`, new `tldr-exa.ts` and `tldr-checks.ts`):**

- `ensureTldr(postId, userId, origin)` runs when a story is published (editor save, new story saved as published, the cron job for scheduled stories, and the admin tool that fills in missing TL;DRs). For a story that is live and a real public address, with an Exa key saved, it asks Exa first. Otherwise, or if Exa fails, OpenRouter writes the points from the article text exactly as before.
- Exa call: `POST https://api.exa.ai/contents` with the live address, `maxAgeHours: 0` (read the page now, not a saved copy), and a summary prompt carrying the same rules as the OpenRouter prompt plus plain-words rules, with a structured answer `{ points: [...] }`. 20 second timeout, two tries. A page that cannot be read yet, a timeout, a server error or points that break a rule get one more try after 3 seconds. A wrong key (401, 402, 403) or a rate limit (429) is not tried again.
- Every Exa reply is checked before it is saved: 3 to 5 points; each 20 to 450 characters and at most 40 words; no dashes, slashes between words, markdown, emoji or stock openers ("This article", "Overall"); every number must be in the story (headline, subtitle or body, thousands commas ignored); words in quotation marks must be in the story word for word; a point of 25 or more words with no punctuation is refused. Dashes in number ranges are turned into "to" (0.5%–2.5% becomes "0.5% to 2.5%"; before, the old cleaner turned it into "0.5%, 2.5%", which was a bug).
- OpenRouter points now also pass the run-on check (a reply with no commas at all is refused and the next model is tried). The full strict list is only for Exa.
- The story is live before Exa is asked (the database write is done), so Publish now takes about 3 to 8 seconds instead of up to 90; the editor shows the points straight away as before. The editor's own Generate / Regenerate button on a draft still uses OpenRouter, because Exa cannot read a draft.
- Settings, Integrations: new "Exa" box for the key (stored like the OpenRouter key: plain text in the `settings` table, last four characters shown; `EXA_API_KEY` works as a fallback), and a line "The last In brief was written by Exa / OpenRouter (date)", with Exa's reason when it fell back. This is how to see that Exa is really working: the last run is saved in the `tldr_last` setting.
- Nothing changes until a key is saved. Cost: about $0.001 per story.

**Checked** (copy of the live data, pretend Exa and OpenRouter that could be switched between behaviours): 55 checks, none failing. No key: Exa never called, OpenRouter writes, no complaint recorded. Key saved through Settings (hidden while typed, last four shown, a too-short key refused, the saved key kept). Exa path: called once with the live address, `maxAgeHours` 0, the answer shape and the full rules, the saved key; the story page answered 200 at the moment Exa was asked (so the story was already live); the points saved; last run "Exa". Page not readable the first time: asked twice with a 3.3 second wait, Exa still wrote it. Invented number and invented quotation: two Exa tries, then OpenRouter, with the reason in Settings. 401 and 429: one Exa call, no retry. HTTP 400: two tries, Exa's own words kept in the note. Empty reply: fallback. Plain bullet-list reply read. Both fail: nothing saved, story still published, "could not be written" recorded. Run-on reply from OpenRouter's first model: second model used; run-ons from every model: nothing saved. Publishing a draft from the editor: Exa asked once, story already live, 4 points saved and shown in 3 seconds. Regenerate button: OpenRouter only. Slow Exa: two 20 second timeouts then OpenRouter (45 seconds). Remove key works. Also 34 unit checks on the rules, including the two real Exa replies the owner pasted: the Rubio one passes every rule; the Indian IT one (one-line prompt) is refused. `pnpm typecheck` 0 errors (22 old warnings), ESLint clean, `pnpm build` passes.

**Found while testing:** a first run rejected my own pretend Exa text because its fourth point began "The article", which the stock-opener rule correctly refused.

**Not verified with the real Exa:** the request shape (in particular `maxAgeHours` and the structured answer) was written from Exa's documentation and the owner's playground results. If the shape is wrong, Exa answers with an error, every story falls back to OpenRouter, and Settings shows Exa's own error text in the last-run line. After the first publish with a key saved, read that line.

**Also found (owner's live site):** 7 of 83 stories have an In brief box with no commas at all (written by a free model before the run-on check existed). The new check stops it for new stories; the old ones have not been regenerated.

---

## Session 49: Load more on the home page, and the wavy hover only inside stories

**Date:** 2026-10-16
**Scope:** Two owner requests. (1) A "Load more" button under the home page's Latest stories, adding the number of stories set in Settings. (2) The wavy underline and background on hover only for links inside stories; story titles (and every other link) change text colour only.

**Found on the way:** the `posts_per_page` setting (saved as 12 in the database) was not read anywhere and had no box in Settings. The home page's Latest list had 10 written into the code, and category pages have 12 written in. So "the number is controlled from Settings" was not true yet.

**Load more (`routes/(public)/+page.*`, `routes/api/latest/+server.ts`, `utils/page-size.ts`, Settings):**

- New box in Dashboard, Settings, General, "Latest stories shown": a whole number from 4 to 50 (12 if empty or unreadable). It is how many stories Latest shows at first and how many each press adds. A bad number is refused with a plain message and nothing is saved; an empty box keeps what was saved.
- The home page loads that many (one extra row tells it whether a button is needed). The button "Load more stories" fetches the next batch from `/api/latest` without reloading, adds it to the list, and moves keyboard focus to the first new story. A screen reader hears "12 more stories loaded". While loading, the button says "Loading…" and cannot be pressed twice. If it fails, a plain message shows above the button and pressing again retries. The button disappears when there is nothing more.
- Without JavaScript the button is a normal form: it reloads the page with `?latest=2`, `3` and so on, showing more stories (capped at 300 rows). Those longer pages are marked noindex, and the canonical address stays the plain front page.
- `/api/latest`: the batch size always comes from Settings (a caller cannot ask for more); refuses a bad offset (400); 60 requests per address per minute (429); sends only the slug, title and topic of each story. The category filter on the home page (`?category=`) also works with it.
- Not changed: category pages still show 12 per numbered page (written into `categories/[slug]/+page.server.ts`); the Setting does not control them.

**Hover:** the wavy underline and tinted background now apply only to `.prose a` (links inside a story's text, and the editor preview). The 30 other places that got it in Session 42 (story titles in every list, carousel, category labels, menu and footer links, author names, sign-in links and so on, plus the dashboard's links) went back to what they were before: the text colour changes and nothing else. Each one was restored from its original rule in Session 42's changes. The small `width: fit-content` changes from then are left (they only make the click area match the text).

**Checked** (copy of the live data, 78 published stories): 6 clicks (12, 12, 12, 12, 12, 6) reached all 78 with no story twice and the button gone; focus and screen reader message; a setting of 5 adds 5; "abc" and "200" fall back to 12, 20 works; no-JS button shows 24, noindex, canonical, huge and negative `?latest=` handled; category filter (23 Geopolitics stories in 12 + 11); failed request shows the message and a retry works; no sideways scroll on a phone; API refused 4 bad offsets, returned 12 / 6 / 0 for the first, last and past-the-end batches, ignored `limit=500`, and answered 429 after the limit. Settings: bad values (abc, 3, 51, 12.5, -5) refused and nothing saved; 8 saved and the home page showed 8, then 16 after one click. Hover: a story title changes colour only (no line, no background); a link inside a story shows the wavy line and background; footer, byline and category label show no wavy line. Found and fixed while testing: the button was missing without JavaScript (it was only decided after the page loaded). `pnpm typecheck` 0 errors (22 old warnings), ESLint clean, `pnpm build` passes.

---

## Session 48: llms.txt

**Date:** 2026-10-15
**Scope:** A `/llms.txt` file: a short guide to the site written for AI tools (the llms.txt proposal by Jeremy Howard, 2024). It is voluntary: no search engine or AI company has promised to read it, and Google has said none of its systems use it. It costs almost nothing and does no harm, so it was added, but no gain in visits or AI mentions should be expected. What matters more for AI tools is still good titles and descriptions, clear author names, the sitemap and not blocking crawlers in `robots.txt`.

**What it is (`routes/llms.txt/+server.ts`, `utils/llms-txt.ts`):** built from the live data on every request (cached for an hour), so it never needs editing by hand. Layout follows the proposal: the site name as the one title, a one-line summary in a quote (what Open Tabs is, published by IndexDaily Media in Delhi, founder Anurag Singh Jakhar), a short note on the stories, then lists of links each with a one-line note: About (the About page), Topics (every topic with its story count), Latest stories (the 40 newest published stories with their subtitle, topic and date; subtitles cut at 160 characters), Optional (all topics, sitemap, RSS feed). Only published stories appear. Brackets in titles are escaped and line breaks removed so one odd title cannot break the list. If the database is down it answers 503 with a Retry-After header instead of a broken file. Sent as plain text, so it opens in a browser.

**Not done:** not listed in `robots.txt` or the sitemap (the proposal does not ask for it), not sent to search engines through IndexNow, and no `llms-full.txt` (all story text in one file) was built; it would be large and nothing is known to read it.

**Checked** (copy of the live data): 11 unit checks on the file builder (title, summary, "1 story" and "12 stories", encoded addresses, escaped brackets, stories with no subtitle or date, long subtitles cut); the real page answered 200 as plain text with a cache header and the usual safety headers; 9 topics and 40 stories; all 53 links in it open (200); exactly one title; longest line 396 characters. `pnpm typecheck` 0 errors (22 old warnings), ESLint clean, `pnpm build` passes.

---

## Session 47: Category tabs you can always reach

**Date:** 2026-10-15
**Scope:** With nine categories the tab strip no longer fits. On a phone you can swipe, but on a desktop the last tabs were cut off with no way to reach them, and on a story page on a phone the open tab could sit half hidden at the edge.

**What changed:** the strip is now its own component, `TabStrip.svelte`, used by both the big header and the slim bar (it replaces two copies of the same markup and styles in `Navbar.svelte`). Two things, the same on every screen size:

- **Arrow buttons** at the ends of the strip, shown only when there are more tabs in that direction (so the back arrow is hidden at the start and the forward arrow at the end). They float over the tabs with a short fade, so they take no room; each click moves about 70% of the visible width. They are hidden from keyboards and screen readers (every tab is already a link they can reach), and the page still swipes on touch.
- **The open tab slides into view**: on page load, when the page changes without a reload, and when the window is resized, the open tab is centred if any of it was out of sight or under an arrow. It scrolls only the strip, never the page. Reduced motion uses an instant jump instead of a slide.

**Checked** (copy of the live data, nine categories) at 1280 and 390 wide: front page open and fully visible; no back arrow at the start; a forward arrow when tabs do not fit; clicking forward reached the end (1 click on desktop, 3 on a phone) with the last tab fully visible and the forward arrow gone; back arrow worked; story pages in Artificial Intelligence, Startups, Business and Geopolitics each showed the open tab fully visible in both the header and the slim bar; clicking the last tab moved to its page with that tab fully visible. 30 checks, none failing. `pnpm typecheck` 0 errors (22 old warnings), ESLint clean, `pnpm build` passes.

**Known:** on a phone the slim bar's strip is only about 200px wide, so a long open tab such as "Artificial Intelligence" sits with about 35px to spare each side; the arrow fade can brush its padding but not its text.

---

## Session 46: "Shown to readers as" name for writers

**Date:** 2026-10-12
**Scope:** The owner wants the writer account to stay "Team Index Daily Media" in the dashboard, while stories show "Anurag Singh Jakhar".

**What changed:** new optional column `authors.public_name` (migration `0017`, adds one empty column; nothing existing is touched). Dashboard, Authors, add or edit: a new box "Shown to readers as" (empty means the Name is used). Everything readers see now uses `coalesce(public_name, display_name)`: story byline, author box, the search-engine data (JSON-LD), the `article:author` tag, story cards, search results, the author page (heading, page title and description) and the Authors lists in the menu and footer. The dashboard keeps the real Name everywhere and the Authors table shows "Readers see: ..." under it. The helper is `authorPublicName` in `queries/authors.ts`.

**Not changed:** the writer's page address keeps its old slug (for example `/authors/team-index-daily-media`). Changing it would need a redirect from the old address; not asked for yet.

**Owner to do after deploy:** there are two writers called "Team Index Daily" in the data: `team-index-daily` (51 stories, linked to a site account) and `team-index-daily-media` (8 stories, no account). Set "Shown to readers as" on both. Also fill in Anurag's bio and photo on them, because the author box under each story shows that writer's bio and photo.

**Checked** (copy of the live data): before setting it, everything showed the old name; after setting it on one writer, the story byline, author box, JSON-LD, `article:author`, author page title and the Authors list all showed "Anurag Singh Jakhar" and the dashboard still showed "Team Index Daily" with "Readers see: Anurag Singh Jakhar"; clearing the box brought the old name back everywhere. Migration applied cleanly. `pnpm typecheck` 0 errors (22 old warnings), ESLint clean, `pnpm build` passes.

---

## Session 45: About page

**Date:** 2026-10-12
**Scope:** The site had no About page (the footer and the design brief both listed it as missing). Built from the text the owner supplied.

**Page (`src/routes/(public)/about/`), redesigned after the owner disliked the first version (a plain stack of text):** built to lean on the site's "every page is a tab" idea. Order: a two-column opening (title, line, first paragraph on the left; on the right a drawn browser window with 37 cramped closed tabs and one open tab "Open Tabs", and a list "Reports, Filings, Numbers, Backstories" crossed out leading to "One story that makes sense."), a heavy rule with "We do the digging for you." large beside the paragraph about what we read, Who is behind it (Anurag's line large on the left, the two figures as big numbers on the right), What Open Tabs is and Why I created it side by side, What to expect as four folder-tab panels (small ear on each, lift and tint on hover), a paper-coloured closing panel with "Less tab chaos. More context." and the Read the latest stories button, then the newsletter box. The picture is decorative (hidden from screen readers; its words are repeated in the text). Motion: the tabs arrive one by one on load (transform and opacity only); nothing moves for people who ask for reduced motion. No shadows, no new colours, only site tokens; light and dark; desktop, tablet and phone; no sideways scroll.

**Also changed:** "About" link in the footer's Pages column; `/about` added to the sitemap (yearly, no last-changed date, since there is none to report); `/about` added to the paths sent to search engines by "Send the whole site now".

**Written by me, owner to check:** the sections What Open Tabs is, Why I created it and What to expect were not supplied, so they are drafted from the owner's text and the design brief. Nothing in them is a figure or a promise beyond what the site already does (4 to 10 minute stories, the "In brief" box, "Keep these tabs open", the newsletter). Typos fixed in the supplied text ("likes talk" to "like to talk", "short and long for content" to "short and long form content"), "Index Daily Media" written as "IndexDaily Media" to match the footer, and the dash after "Welcome to Open Tabs" replaced by the page title and a dek, as the copy rules ban dashes.

**Checked:** `pnpm typecheck` 0 errors (22 old warnings), ESLint clean on the new files, page loads with the right title and address, no sideways scroll at 1280 and 390 in both themes.

---

## Session 44 — Sign-in lock, sign-up limits, working unsubscribe, smaller fixes

**Date:** 2026-10-11
**Scope:** The rest of the before-launch security check, after Session 43. Decisions from the owner: sign-up gets limits only (no confirm-by-email link), and the login form gets a lock after wrong tries.

**Counters in the database (`rate-limit.ts`, new `rate_limits` table, migration `0016`):** one row per thing counted (a key, a count, when the window started). It replaces the old in-memory counters, which reset often and were per server. `countHit` adds one and says whether the limit is passed; `checkLimit` only looks; `clearLimit` forgets a key.

**Sign-in lock (`login/+page.server.ts`):** 5 wrong passwords for one email, or 30 from one address (guessing across many emails), within 15 minutes, locks that email or address until the 15 minutes are up. A correct password clears the email's count. The message says how long to wait. Better Auth's own `/api/auth/sign-in*` and `/api/auth/sign-up*` addresses are closed (404) in `hooks.server.ts`: the site never uses them, and they skipped the lock and the limits. `get-session` and the rest still answer.

- **Worth knowing:** someone who knows an email can lock that person out for 15 minutes by typing wrong passwords. That is the usual cost of a lock; a locked admin can wait it out or an entry in `rate_limits` can be deleted.

**Sign-up limits:** `/register` and `/newsletter/setup` share a limit of 5 per hour per address, and each form has a hidden box that people never see; a bot that fills it is refused. `/api/newsletter/subscribe` allows 20 per hour per address, and `/api/check-email` and `/api/check-username` 30 per minute (now counted in the database). Still open by choice: no email confirmation, so someone can still sign up with another person's address, only slowly.

**Unsubscribe (`unsubscribe-token.ts`, `unsubscribe/+page.*`):** the link in the welcome email now carries a signed token (made from the email and `BETTER_AUTH_SECRET`; only the site can make one). Opening it shows a button; the button does the unsubscribing, so mail scanners that open every link cannot unsubscribe anyone by accident. It switches off `isNewsletterSubscriber` and the Resend contact. A missing or forged token shows "This link doesn't work". Before this, the link went to a page that said "You've been unsubscribed" and did nothing. The link also gets `https://` added if the site address is saved without it.

- **Not done:** the `List-Unsubscribe` email header (the one-click button mail programs show). SvelteKit's form protection refuses a post that has no origin, which is what mail programs send, so it needs its own design.

**Smaller fixes:**

- A writer can only publish under their own name; admins can choose any author (the form did not check).
- The analytics ID boxes in Settings only accept the real shapes (GTM-…, G-…, a number for the Meta pixel, a UUID for Umami, an https share link) with a plain message, since they go into the code of every page. (Clearing an ID by leaving the box empty still does not clear it; that was already so.)
- Profile picture addresses must start with `https://` (dashboard account and profile edit).
- Email addresses were taken out of the logs (sign-in, sign-up, sending, bounces).
- Packages: Tiptap 3.23.5 to 3.31.4 and `nanoid` 5.1.11 to 5.1.16. `pnpm audit --prod` now reports no known problems (it reported 4). Editor checked: typing, bold, autosave to a draft, word count, opening existing stories with links.

**Checked** (copy of the live data): API sign-up and sign-in closed; 3 wrong then right works, the right one clears the count, 5 wrong locks (even the right password is refused), another email unaffected; register limited at exactly 5 (400 x5 then 429); honeypot refused on both forms; check-email limited at 30 and subscribe at 20; token round trip and 9 forged or broken tokens refused; opening the unsubscribe link does nothing, the button unsubscribes, a forged token posted directly does nothing; an author refused as someone else and fine as self; every bad analytics ID refused and real shapes accepted; non-https avatar addresses refused. `pnpm typecheck` 0 errors (22 warnings, same as before), ESLint clean, `pnpm build` passes.

**Still open:** the Resend and OpenRouter keys are stored as plain text in the database (only the last four characters are shown); signing up with someone else's email address (limits only); who-has-an-account lookups (rate limited, not removed); the `assets.indexdaily.in` header rule in Cloudflare; the `List-Unsubscribe` header.

---

## Session 43 — Security fixes before launch

**Date:** 2026-10-11
**Scope:** Four fixes from the before-launch security check: hidden-script gaps in page data, unsafe links in articles, missing safety headers, and open uploads.

**1. Hidden-data scripts (`utils/seo.ts`, public layout, post page, author page):** the page data for search engines (JSON-LD) is written into the page as raw HTML. The article block escaped `<`, but the breadcrumb block (story title, category name), the site block (site name, tagline) and the author block (name, bio) did not, so a title containing `</script>` ended the block and ran code. All four now go through one helper, `jsonLdScript()`, which writes every `<` as `\u003c`.

**2. Article links and pictures (`utils/tiptap-to-html.ts`):** the editor refuses `javascript:` links, but the code that shows an article trusted whatever was stored, so crafted data could add one. Links now only pass for `http`, `https`, `mailto`, `tel` and addresses inside the site (spaces, tabs and line breaks inside the scheme are ignored first, as browsers do); an unsafe link is shown as plain text. Pictures must be a web address or a site address. Checked against the copy of live stories: none use anything else.

**3. Safety headers (`lib/server/security-headers.ts`, `hooks.server.ts`, `_headers`):** every page now sends: a content policy, no framing (`X-Frame-Options: DENY` and `frame-ancestors 'none'`), no type guessing, a referrer rule, a permissions rule, and strict HTTPS for one year (HTTPS only, no sub-sites). Files served from storage (`_headers`) get the same basics. The content policy lists the analytics tools the site can use (Umami, Google Tag Manager and Analytics, Meta pixel, Cloudflare analytics) and fonts; pictures may come from any web address. Plug-ins, a changed base address and forms posting to other sites are blocked.

- **Limit worth knowing:** scripts may still run inline, because the analytics snippets are inline. So the policy blocks scripts and requests going to sites that are not listed, but it does not stop injected inline code. Fixes 1 and 2 are the real protection; the policy is the safety net.
- Testing with every analytics tool switched on found two addresses that were missing (`gateway.umami.is`, `www.google.com/g/collect`); both are now allowed. After that, no violations on the home, story, categories, search, login, register, newsletter, dashboard, editor, settings, account and profile pages.
- **Not covered:** the pictures domain (`assets.indexdaily.in`) is served by Cloudflare storage and needs its own header rule in Cloudflare (a Transform Rule adding `X-Content-Type-Options: nosniff`).

**6. Uploads (`api/upload`, `lib/server/upload-rules.ts`):**

- The file type is read from the file's first bytes (JPEG, PNG, GIF, WebP, AVIF), not from what the sender says, so an HTML file called `a.png` is refused. The stored file ending and type come from that check, not from the file name.
- Each person's pictures go in their own folder (`uploads/u-<hash>/`, the hash hides the user id). Writers (author, admin) have no cap. Readers, who can sign up freely and only need a profile picture, are capped at 20 pictures. Over the cap answers 429.
- Size stays at 5 MB for everyone. A smaller reader limit would silently break phone photos, because the profile page does not shrink them first.
- Existing pictures stay where they are.

**Checked** (copy of the live data): a story titled `</script><script>window.__xss=1</script><img onerror=...>` published and opened: nothing ran, both data blocks still parse, and the title is intact inside the data. A `javascript:` link was dropped and an `https` link kept. A script from another site was refused. Framing refused by headers. Upload, with a fake storage: logged out refused; PNG ok; HTML named `.png` refused; JPEG named `.php` stored as `.jpg`; over 5 MB refused; a reader stopped at 20 and an admin did not; each in their own folder. Link and upload rules also have direct tests.

**Still open from the check** (not asked for in this session): sign-up without email checks and no limits on the newsletter sign-up, no guard on password guessing at the login form, the unsubscribe link that does nothing, known problems in the editor packages, who-has-an-account lookups, writers posting under other authors, unchecked analytics ID boxes, keys saved as plain text, and in-memory request limits.

---

## Session 42 — Carousel keeps moving under the pointer, new link hover, tag list in the editor

**Date:** 2026-10-11
**Scope:** Three fixes from using the live site: the featured stories stopped moving, links only changed colour on hover, and the tag suggestions in the editor ran off the bottom of the screen.

**Carousel (`CarouselHero.svelte`):**

- **Cause:** the line (and the carousel) froze whenever the pointer was anywhere over the carousel. The carousel is about 1,000px tall, so on a laptop the pointer is over it almost all the time, and the stories only moved while the pointer was elsewhere. That is why the line seemed to work "in a few stories". Reproduced on the live site: with the pointer parked on it, it stayed on story 1 for 20 seconds.
- **Fix:** the pointer no longer pauses it. Keyboard focus inside it still does (a keyboard user is using it), and so does the Pause button (people can always stop it). Checked: pointer parked over it, after clicking a tab, after clicking an arrow, and on a phone-sized screen, all moved every 5 seconds through all seven stories and round again.

**Link hover:**

- On hover a text link keeps its colour, gets a soft background (`--accent-light`, or `--color-admin-accent-light` in the dashboard) and a wavy accent underline (2px, 4px below the text). Where it was already underlined, the straight underline turns wavy.
- Applied to text links on the public site: story titles and category names, category kickers, author names, "filed under" links, footer links, section actions, sign in links, the links in article text (`.prose a`), form messages, the log in and register switch links, the back link on the unsubscribe page, and the dashboard `.ad-link`. Not changed: buttons, the navbar and profile tabs, filter buttons, share and bookmark buttons, which are controls and keep their own hover.
- Links that were wider than their words (footer links, author name, the kickers and titles in the latest list and search, category names) are now only as wide as the text, so the background hugs the words.

**Tag suggestions in the editor (`TagInput.svelte`, `PostEditorLayout.svelte`):**

- **Cause:** the Meta tab is long, so the Tags field sits near the bottom of the screen. Its suggestion list is pinned to the screen and was placed under the hint text below the field, so on a 800px high screen it started at 740px and ran to 1,100px, with the rest cut off and nothing to scroll. The side panel's own scroll bar was also a 5px line in a colour barely different from the page, so it was hard to tell the panel scrolls.
- **Fix:** the list is placed from the field itself. It opens under the field, or above it when there is little room below, is never taller than the room it has (it scrolls inside), and follows the field if the page or the side panel is scrolled while it is open. The side panel's scroll bar is now a thin, visible one. Same component on the new post page.
- **Checked** at 1360x800, 1360x600, 1360x1000 and 390x800: list fully on screen every time, and it stays next to the field after scrolling the panel.

**Worth knowing:** category kickers are orange text, and on the hover background that is 4.3 to 1 contrast in the light theme (AA asks for 4.5 for small text); it only shows while hovering, and the page text is unaffected. Orange on any visible tint is below 4.5, because orange on the plain paper is only 4.8.

---

## Session 41 — IndexNow

**Date:** 2026-10-11
**Scope:** Tell search engines the moment a story goes live, changes or is removed, instead of waiting for them to come back.

**What it does:**

- **Key and key file.** A random 32 character key is made the first time it is needed and kept in `settings` (`indexnow_key`). Search engines check ownership by opening `/{key}.txt`, which now exists (`src/routes/[key=indexnowkey].txt`, with the matcher in `src/params/indexnowkey.ts`). Any other name answers 404, and `robots.txt`, `sitemap.xml` and `feed.xml` are untouched.
- **When it sends** (`src/lib/server/indexnow.ts`): first publish, an explicit Update or Save on a live story, unpublishing, deleting a live story (dashboard list or edit page), and scheduled stories when the cron route publishes them. A changed slug sends the old and new address; a changed category sends the old and new category page. Every ping also lists the home page and the story's category page.
- **When it does not:** autosave (the edit and new pages add a hidden `autosave` field when the timer started the save), saving a draft, or deleting a draft.
- **Never in the way.** The ping runs after the page has answered (`ctx.waitUntil`) and never throws, so a slow or refusing search engine cannot break saving a story. A refusal is logged (`indexnow.rejected`).
- **Local copies stay silent.** Nothing is sent when the address is localhost, 127.x or `.local`.
- **Settings, Integrations, "IndexNow":** an on/off switch (on by default, `indexnow_enabled`), the key file address, the last result (`indexnow_last`), and "Send the whole site now" for a one-time bulk send of the home page, category index, every live story and every category with a live story (works even when the switch is off).
- New queries in `queries/posts.ts`: `getStoryPublicInfo`, `getStoryPublicInfos`, `getPublicSitePaths`.

**Decisions:**

- The address comes from the request, not `PUBLIC_SITE_URL` (which is saved without `https://` in `wrangler.jsonc`). The cron route is the exception: whatever calls the timer may use another address, so it prefers `PUBLIC_SITE_URL` (read from `$env/dynamic/public`, because the private one leaves out `PUBLIC_` names) and adds `https://` if missing.
- Sent to `api.indexnow.org`, which passes the list on to Bing, Yandex, Naver, Seznam and Yep. If it answers 429 (it limits by sending address, and Cloudflare's addresses are shared by many sites) or a server error, the same list goes to `www.bing.com/IndexNow`, then `yandex.com/indexnow`, `search.seznam.cz/indexnow` and `searchadvisory.naver.com/indexnow`. When all of them fail, the message and the "Last try" line name each one with its answer (for example "api.indexnow.org 429, www.bing.com 520"); the first live run ended in HTTP 520 with only the status of the last one shown. A 403 or 422 (bad key or address) is not retried, as every endpoint would refuse it. Found when the first real "Send the whole site now" returned 429; the fallback is tested with fake responses only, not against the real services. Google does not use IndexNow, so it still finds stories through the sitemap.

**Checked** (copy of the live data, fake IndexNow server): key file returns the key as plain text; wrong or too short names 404; create as published, Update, slug change, category removal, unpublish, delete of a live story (edit page and list) each send one ping with the right addresses; autosave, draft saves, deleting a draft and scheduling send none; cron sends with the `https://blog.indexdaily.in` address; switching off stops pings but "Send the whole site now" still sends all 68 addresses; a 429 from the search engine shows a plain message and "Last try failed"; a real autosave in the browser sent nothing and clicking Update sent one; localhost sends nothing. Settings looks right in light, dark and on a 390px screen. `pnpm typecheck` 0 errors (22 warnings, the same as before), ESLint clean.

**Also:** `kit.version.pollInterval` is set to 60 seconds in `svelte.config.js`. A tab left open across a deploy now notices the new version and loads it on the next click. This is the likely cause of the one-off 500 on New Post and Edit Post (not reproduced, so unconfirmed).

**Worth knowing:** `pnpm lint` still fails on Prettier formatting in four files this session did not touch (`SKILL.md` under `.agents`, `emails/+page.server.ts`, `email-preview/+server.ts`, `newsletter/setup/+page.server.ts`). Existing code reads `PUBLIC_SITE_URL` from the private env in a few places (`resend.ts`, `email-preview`, `emails`); on Cloudflare that leaves it empty, so those fall back to the hard-coded address. Left alone.

---

## Session 40 — Softer carousel, and autosave everywhere in the editor

**Date:** 2026-10-10
**Scope:** Replace the sliding carousel with a soft crossfade and show the time left on the open tab; make the story editor autosave properly.

**Carousel (`CarouselHero.svelte`):**

- **Crossfade, no sliding.** Changing story fades the old one out (0.22 s), puts the next in place while nothing is visible, and fades it in (0.36 s). Swiping with a finger still scrolls. People who ask for less motion get an instant swap.
- **A thin orange line fills along the open tab over 5 seconds** (a faint track behind it). The line now drives the timing: when it is full, the next story comes in. Pointer over the carousel, or keyboard focus inside it, freezes the line where it is (and so the carousel) and it carries on from there. Changing story, pressing Start, or the tab or carousel coming back into view restarts it from empty. Pause removes the moving line (the faint track stays).
- The earlier timer and the "is it being used" check were removed; there is one source of timing now.

**Editor autosave:**

- **Edit page:** it already saved 3 seconds after a change to the title, subtitle, slug, text and TL;DR. Now every saved field does: cover image, category, tags, author, featured and excerpt too.
- **New post page:** it had no autosave (the timer did nothing). Now, once the story has a title, the first save quietly creates a draft and the page stays as it is, so typing is not interrupted; the address bar switches to the real edit address, so a refresh opens it. Every later save goes into that same draft. An autosave only ever saves a draft; publishing is always the writer's own click, and pressing Publish or Save after the draft exists opens the real edit page. With no title yet, nothing is saved and the badge says "Add a title to start saving".
- **Safeguards (both pages):** saves never overlap (a save that comes due while one is running waits for it, so a new story can never be created twice); putting the browser tab in the background saves straight away; refreshing or closing the tab with unsaved changes asks first; a failed save stays marked as unsaved so it is retried; deleting a story stops any waiting save. Shared helper: `src/lib/utils/autosave.ts`.

**Checked** (copy of the live data): crossfade (lowest opacity 0.07, one position change while it is invisible, back to 1; reduced motion never dims), the line (fills 5 s, orange, frozen under the mouse, absent when paused, restarts), timing about every 5 s. Edit page: category, tag, excerpt and featured changes each saved 3.0 s later; leaving with unsaved changes asks, and does not once saved; hiding the tab saved at once. New page: nothing typed saves nothing and does not ask; title makes one draft after 3 s with the page unchanged; more text goes to the same story; edits made while a save was running ended with one story and all the text; Publish opened the real edit page; refresh showed the saved story; hiding the tab with only a title saved at once. The database held exactly one story, all text present. `pnpm typecheck` 0 errors, ESLint clean, `pnpm build` passes.

**Worth knowing:** autosave on a story that is already published saves straight to the live story, as before (it saves whatever status the story has). Leaving the editor through an in-site link is not guarded, only a refresh or closing the tab; the 3 second wait and the saving when the tab is hidden keep that window small. The author cannot be changed after a story is created (the edit save never wrote it), so changing the author on the new page after the first autosave is not kept.

---

## Session 39 — Featured stories rotate by themselves, slim navbar while reading

**Date:** 2026-10-10
**Scope:** Two changes to the public site: the featured carousel moves on its own every 5 seconds, and the navigation stays visible, in a smaller form, while a reader scrolls.

**Carousel (`CarouselHero.svelte`):**

- Moves to the next featured story every 5 seconds. Picking a story or pressing an arrow restarts the 5 seconds. After the last story it jumps back to the first, instead of sliding past all of them.
- It waits while the pointer is over it or keyboard focus is inside it (checked when the timer fires, so it can never be left in a stale state), while the browser tab is in the background, and while the carousel is scrolled out of view. A click on a button does not count as keyboard focus.
- A pause and start button sits next to the arrows (a stop control is needed for automatic movement). People whose device asks for less motion start with it off and can start it themselves. While it runs, the "2 of 8" label does not announce every change to screen readers.
- This reverses an earlier choice: Session 32 removed auto-play because the design had none.

**Slim navbar (`Navbar.svelte`):**

- Once the big masthead has scrolled out of view, a 52px bar slides in at the top and stays. It has a small wordmark, the category tabs (the section you are in is the open tab, joined to the page below as in the masthead), a search icon, the theme toggle and your account or Sign in. On phones it has the wordmark, the tabs and search only; the full menu is at the top of the page.
- Hidden at the top of the page, and switched off for keyboards and screen readers while hidden. On story pages the reading progress line sits on its top edge. The bar slides without animation for people who ask for less motion, and is left out of printing. `scroll-padding-top` was added so links to a heading do not hide behind it.
- Search in the slim bar opens the search page, rather than expanding in place as the masthead does.

**Checked:** in a browser against a copy of the live data (8 featured stories): it advanced about every 5 seconds untouched; held while the mouse was over it, when paused with the button, with real keyboard focus inside it, with the reduced-motion setting, and when scrolled out of view; clicking a tab, an arrow or Start restarted the 5 seconds. The slim bar was hidden at the top and shown after scrolling on the home page and a story, in light and dark, on desktop and phone; its open tab matched the story's section and clicking another tab went there. `pnpm typecheck` 0 errors, ESLint clean, `pnpm build` passes.

**Caught on the way:** a first version kept "mouse is over it" as a flag set by events. After a click that swapped the pause button's icon, the browser did not send "mouse left", so it stayed paused for good. The check now asks the browser at the moment the timer fires.

**Not tested:** a real phone or touch swipe (a touch screen skips the hover rule by design), and Safari.

---

## Session 38 — OpenRouter key saved in Settings

**Date:** 2026-10-10
**Scope:** The OpenRouter key no longer has to live in Cloudflare. It is pasted in the dashboard, so it can be changed without a deploy or a trip to Cloudflare.

**Built:**

- **Dashboard, Settings, Integrations:** a new "OpenRouter (story summaries)" section with a password field, "Save key" and "Remove saved key". The saved key sits in the `settings` table (`openrouter_api_key`), like the Resend key, so no migration was needed.
- **Checked on save:** the key is tested with OpenRouter (`GET /api/v1/key`, no tokens used) before it is stored. A key OpenRouter rejects is not saved. If OpenRouter cannot be reached, the key is saved and the page says it could not be checked. Input with spaces or a silly length is refused without asking OpenRouter.
- **Never sent back:** the Settings page only gets the last four characters. The field is cleared after saving. The same change now applies to the Resend key: before, its full value was included in the page data and trimmed in the browser. The Resend hint now reads the last four from the server.
- **Used straight away:** `tldr.ts` reads the saved key each time a summary is written (Publish, the editor button, scheduled posts, the bulk writer), so a new key applies to the very next one. If no key is saved, the `OPENROUTER_API_KEY` variable in Cloudflare is used as a fallback, so nothing broke when this shipped; delete it once a key is saved here. If the settings table cannot be read, the fallback is used too.
- **Messages:** "No OpenRouter key yet. Add one in Dashboard, Settings, Integrations, then try again." and "OpenRouter rejected the key. Check or replace it in Dashboard, Settings, Integrations."
- Pressing Enter in the key box saves; it can never remove the key (the remove button comes after the save button).
- `CLAUDE.md` env table and `.dev.vars.example` now call `OPENROUTER_API_KEY` an optional fallback.

**Checked:** the real `tldr.ts` against stand-ins (saved key wins over the server key, a changed key applies on the next call, blank and spaced keys, no key anywhere means no network call, a failing settings read falls back, key check on 200, 401, 503 and no network). In a browser against a copy of the live database with no server key: no key gives the new message; a rejected key is not saved; a good key is saved and only its last four characters appear; the full key is in neither the page nor its data; a summary was written with the saved key; replacing the key was used by the next summary; Enter saves; a key OpenRouter later rejects points to Settings; removing it brings the "no key" message back. `pnpm typecheck`, ESLint and `pnpm build` pass.

**Noted:** the key is stored as plain text in the database, the same as the Resend key. Only admins can open Settings.

---

## Session 37 — Dashboard redesign, first-party analytics removed

**Date:** 2026-10-09
**Scope:** Redesign every dashboard page in the open-tab design from Sessions 32 and 33, and drop the first-party analytics.

**Removed (first-party analytics):**

- Tinybird client, the Analytics page, the Logs page, `/api/track`, the unused client `track.ts`, pageview logging in `hooks.server.ts`, the traffic widgets on the home page, the user activity timeline, the "errors in the last hour" badge, the `tinybird/` folder, `scripts/tb-sync.mjs` and the `tb:sync` command, the "Sync Tinybird pipes" step in `deploy.yml`, and the `TINYBIRD_*` entries in `.dev.vars.example`.
- `logger.ts` now writes one JSON line per event to the console (Cloudflare keeps these). The `logger.info/warn/error` calls everywhere are unchanged. `queries/analytics.ts` became `queries/dashboard.ts` and only holds numbers from our own database.
- Analytics are in Umami. The menu has "Analytics ↗", which opens the saved Umami share link; admins see "Add analytics link" until one is saved in Settings.
- `docs/architecture.md` updated. **Left for you:** the `TINYBIRD_*` variables can be deleted from Cloudflare Pages and the GitHub secrets, and the Tinybird workspace can be closed.

**Built:**

- **Tokens.** The dashboard now uses the same paper, ink and burnt-orange tokens as the public site, with a real dark mode (the old admin palette is gone). Status colours were re-picked for AA contrast in both themes.
- **Shell.** Grouped menu (Write, Organise, People and mail, Site), the open item is a tab joined to the page, serif page title on a heavy rule, a theme toggle, icon-only rail below 1280px, drawer on phones. Admin-only items are hidden from authors.
- **Shared parts** restyled: fields (40px, 44px on touch, error border, hints and errors tied to their field), tables, status badge (dot plus text, also pending, approved, rejected), stat tiles, empty states, toasts, pagination, delete dialog (focus starts on Cancel, Enter never deletes). New: `SectionHeading` (the "ear") and a global kit (`ad-btn`, `ad-tabs`, `ad-toolbar`, `ad-link`).
- **Home.** Content and people only: story counts, recent stories, a "Needs you" list (comments waiting, drafts, stories without a TL;DR, missing Umami link), people and mail numbers with a 7, 30 or 90 day switch. Authors see only their own stories and no people numbers. (Before, every author could see every story's title and status.)
- **Pages:** Posts, Comments, the editor (new and edit), Categories, Tags, Authors, Users and user detail, Newsletter, Emails and email detail, Settings, the error page.
- **New My account page** (`/dashboard/account`) for every dashboard role: name, username, photo. Fixes the gap where authors and admins had no working place to edit their own profile. The public profile page now links to it, and `#account` on Settings redirects to it.
- Settings: opening `/dashboard/settings#integrations` selects the Integrations tab and focuses the Umami share field. The unused `saveAccount` action was removed.
- The home "Delivered" number now counts emails that were later opened or clicked.
- Small: confirm dialogs replace browser `confirm()` for deleting stories and users; profile photo shows in the sidebar with an initials fallback.

**Checked:** `pnpm typecheck` 0 errors (22 warnings, 1 fewer than before), ESLint clean on the whole project, `pnpm build` passes. Every page was looked at in light and dark, desktop and phone, on a copy of the live database. An author account was tested: admin pages send it back to the dashboard and its menu shows only Dashboard, Posts, Analytics and My account.

**Not tested:** real photo upload to R2, sending a real test email, the bulk TL;DR writer, delete confirmations that actually delete, pending-comment rows (the test data has one approved comment).

**Noticed, not changed:**

- Cover image paste: pasting an image into the article body may also set it as the cover and upload it twice (`CoverImageUploader` listens on the whole window).
- Changes to cover image, category, tags, author, featured and excerpt do not trigger autosave, so the "Saved" badge can be out of date until the next save.
- Choosing Schedule sets the status but does not save until "Save schedule" is pressed (the button now says so).
- The SEO panel's OG and Twitter fields have no `name`, so they are never saved; only the excerpt is.
- The server allows duplicate category names and duplicate author display names; renaming a tag changes its slug.
- The emails page "delivered" total (`email-sends.ts`) still counts only emails whose last event is exactly "delivered".
- Users list: no search or role filter yet; user detail has no recent comments or saved-stories lists (both need server data).
- `Pagination` and a few helper-built pages repeat small bits of CSS (row buttons, role and delivery badges) that could become shared parts.

---

## Session 36 — Inkling removed, 403 no longer means "bad key"

**Date:** 2026-10-09
**Scope:** The first real publish after Session 35 showed "OpenRouter rejected the key" with `inkling: HTTP 403: thinkingmachines/inkling:free is only available on agentic harnesses`.

**Found:**

- OpenRouter only lets the free Inkling run from approved coding and productivity tools. Every other app, including this site, gets a 403. It cannot be used here, so it is out of the list. (Using it would also have cost one of the 50 free requests a day on every publish for nothing.)
- The code treated any 403 as a wrong key, which stopped the whole chain and told the writer to check the key. The key was fine. Now only a 401 means a wrong key. A 403 is a new failure type, `refused` ("OpenRouter would not let this model handle the request"), which moves on to the next model and does not stop a bulk run.

**Now:** `dots-studio/dots-3-note-preview:free` first (`TLDR_MODEL`), then `nvidia/nemotron-3-super-120b-a12b:free`, then `nvidia/nemotron-3-ultra-550b-a55b:free` (`TLDR_FALLBACK_MODELS`). Nemotron 3 Super was added second because its host was up 100% over the last day, while Nemotron 3 Ultra's was up 48% (7% over 30 minutes), so Ultra goes last. Other free candidates at 100% uptime when checked: `nvidia/nemotron-3.5-lightning:free`, `google/gemma-4-26b-a4b-it:free` (its 429s came from Google's shared free pool). If all three models hang, a Publish waits about 90 s (three 30 s timeouts).

**Checked:** real `tldr.ts` against a fake OpenRouter: a 403 on the first model moves to the second; a 403 on both ends as `refused`, not "key rejected" and not a run-stopper; a 401 still says the key was rejected and does not switch; 429 and a single 503 behave as before; with three models, Super is tried before Ultra and the final message names all three. Dots and Super have not been called for real yet.

---

## Session 35 — Three TL;DR models, and writing a TL;DR by hand

**Date:** 2026-10-09
**Scope:** The free Gemma model kept returning 429 from its host, so the model list changes. Writers can also type a TL;DR themselves.

**Built:**

- **Model order** (hardcoded in `src/lib/server/tldr.ts`): `thinkingmachines/inkling:free` first (`TLDR_MODEL`), then `dots-studio/dots-3-note-preview:free`, then `nvidia/nemotron-3-ultra-550b-a55b:free` (`TLDR_FALLBACK_MODELS`). Gemma is no longer used. Each model gets 2 tries for a server error or dropped connection; any other failure except a bad key or an empty account moves on to the next model. If all three fail, the message names each model and what it said.
- OpenRouter's uptime numbers when picked: Inkling 99% over the last day, Dots 94%, Nemotron 48% (7% in the last 30 minutes), so Nemotron is last.
- Per-model timeout is now 30 s (was 35 s). Worst case, if all three models hang, a Publish waits about 90 s. The story still goes live.
- **Writing a TL;DR by hand.** The TL;DR tab used to show only "Generate" when a story had none, and "Add a point" only appeared after a point existed. Now an empty tab has "Write your own". On the new-post page the tab has the same box (without Generate). Points typed there are saved with the story, as a draft or published, and the model is not called. If the box is left empty, one is written when the story is published, as before. The Regenerate button only asks for confirmation when a box has text.

**Checked:**

- Real `tldr.ts` against a fake OpenRouter: order Inkling, Dots, Nemotron; a 429, 503, unusable answer or 404 moves to the next; a bad key or empty account does not; all three failing names all three; a story that already has a TL;DR never calls the model.
- Browser, on a copy of the live database with a fake OpenRouter: typed points on the editor saved and shown again; new post published with typed points (0 model calls); new post as draft with typed points saved (0 model calls); new post published with nothing typed got a written TL;DR (1 model call). Test copy deleted.
- `pnpm typecheck` 0 errors, ESLint and Prettier clean, `pnpm build` passes.
- **Not tested:** a real call to Inkling or Dots. Their first real replies need a look.

---

## Session 34 — "In brief" label and abstract

**Date:** 2026-10-09
**Scope:** Rename the public TL;DR box and feed the same summary to search tools. The editor, dashboard, database and code keep the name TL;DR.

**Built:**

- Public label is now **In brief** (`TldrBox.svelte`). The box is a `<section>` with a real `<h2>` (was an `<aside>` with a paragraph), so it sits in the article's outline rather than reading as side content.
- The Article structured data (`NewsArticle` JSON-LD on the post page) now has an `abstract`: the points joined into one passage, each ending in a full stop. Left out when a story has no TL;DR.
- The structured data is now written with `<` escaped as `\u003c`, so model-written text can never close the script tag early. Still valid JSON.

**Checked:** on a copy of the live database, the post page shows the `In brief` heading, no "TL;DR" text anywhere, and a correct `abstract`. Looks the same as before on desktop and mobile. Typecheck 0 errors, ESLint and Prettier clean. The test copy was deleted.

**Not promised:** the `abstract` field and the heading are small hints; neither guarantees any search or AI citation.

**Model order swapped (2026-10-09):** `google/gemma-4-26b-a4b-it:free` is now the main model (`TLDR_MODEL`) and `nvidia/nemotron-3-ultra-550b-a55b:free` the fallback (`TLDR_FALLBACK_MODEL`). Reason: Gemma's free endpoint had far better uptime. Nothing else changed: same two tries per model, same switch rules.

---

## Session 32 — Automatic TL;DR (OpenRouter)

**Date:** 2026-10-09
**Scope:** Write a TL;DR for each story when it is published, show which stories have one, and let the editor generate or edit one by hand.

**Built:**

- `src/lib/server/tldr.ts`: the OpenRouter call, plain-text extraction from the editor JSON, reply checking, and `ensureTldr()` (never throws). Only the article text is sent: no title, subtitle or category.
- **Model is hardcoded:** `nvidia/nemotron-3-ultra-550b-a55b:free` (`TLDR_MODEL`). The key is the only setting: `OPENROUTER_API_KEY`, added to `.dev.vars.example` and the `CLAUDE.md` env table. It must also be added in Cloudflare Pages.
- **When it runs:** the first time a story becomes published, if it has no TL;DR: new post saved as published, Publish or Update on an existing post (compares the status before the save), and scheduled posts (timer, up to 3 per run, after the reply). Autosave never triggers it. A failure never stops a story going live.
- **Editor:** new "TL;DR" tab beside Meta and SEO: editable points, Generate or Regenerate (asks before replacing), error text. If a publish could not write one, the editor jumps to that tab and shows why. The new-post page has the tab with a one-line note.
- **Posts list:** a TL;DR column (green tick or dashed icon, with text for screen readers) and a "Any / Missing / Has TL;DR" filter.
- **Bulk writer (admins):** a strip above the Posts table says how many published stories have no TL;DR and has a "Write them now" button. The browser asks the server for one story at a time (newest first), so no request outlasts the model. It shows progress, has a Stop button, skips a story that fails, and stops by itself on a rate limit, an empty account or a bad key. Running it again carries on.
- No database change: `posts.tldr` already existed. Setting a TL;DR does not change `updated_at`, so it does not reorder the list or move sitemap dates.

**Decisions:**

- Reply is plain text, one `- ` line per point, checked in code (3 to 5 points, 20 to 450 characters, dashes replaced). The free model has no structured-output support. It is a reasoning model, so the request sets `reasoning.effort` to `low` and allows 4000 output tokens.
- Publishing waits for the model for up to 35 s (one retry on a server error). If it is slow, Publish takes that long.
- Hand edits are saved only after a keystroke in the TL;DR box, so an autosave cannot overwrite a freshly generated TL;DR with stale text.

**Free-tier limits (OpenRouter):** 20 requests a minute and 50 a day until the account has bought 10 credits, then 1,000 a day. Backfilling 50+ stories one by one will hit the daily cap. OpenRouter's pages do not say whether prompts to free models are logged or used for training.

**Verification:**

- `pnpm typecheck` 0 errors, Prettier and ESLint clean on changed files, `pnpm build` passes.
- 40 checks of the real `tldr.ts` code against a fake OpenRouter: text extraction, reply parsing, every failure type, retry rules, and that the request carries only the article text.
- Browser run against a throwaway Neon branch with a stand-in for OpenRouter: list icons and filter, Generate, hand edit and autosave, rate-limit and bad-reply errors, publishing a draft, no model call from later autosaves, and the bulk writer (rate-limit stop, Stop button, resume, one too-short story skipped; 43 of 44 written).
- **Not tested:** a call to the real model. No key was available in the session. The first real run is on the live site.

**Also fixed:** the Posts page returned a 500 for author accounts (the count query used the authors table without joining it). No author accounts exist yet, so nobody had hit it.

**Deferred:** watching the first real replies and tuning the prompt; admin screens still show the first-party analytics pages.

**Follow-up: clearer TL;DR errors (2026-10-09):** the first real try showed only "OpenRouter had a problem. Try again." That text was the catch-all for any failure, so the real reason was lost. OpenRouter's own numbers showed why: the free Nemotron 3 Ultra endpoint was up about 45% of the time over the last day, so it was often returning server errors.

- Errors now carry OpenRouter's own words and the HTTP code, for example "OpenRouter or the free model is not answering properly right now. Try again in a minute. (HTTP 503: Provider returned error)". Shown in the editor, the bulk strip and the publish message, and written to the server console.
- **Automatic fallback model:** if `nvidia/nemotron-3-ultra-550b-a55b:free` fails (down, slow, rate limited, model not found, or an answer we cannot use), the same request goes to `google/gemma-4-26b-a4b-it:free` (`TLDR_FALLBACK_MODEL`, hardcoded like the main one). Each model gets 2 tries for a server error or dropped connection, with a 1.5 s wait. A wrong key or an empty account does not switch, because the other model would fail the same way. If both fail, the message names both and what each said. Worst case a Publish waits about 70 s (two 35 s timeouts).
- A fault in our own code or database while saving no longer says "OpenRouter had a problem". It has its own message (`internal`).
- An empty or unusable model answer now says so.
- Checked with a fake OpenRouter: every failure type, retry then success, switch to Gemma on 503, 404, 429, dropped connection and unusable answer, no switch on a bad key or empty account, both failing.
- Gemma was at 99.8% uptime over the day when it was picked as the fallback. Its replies have not been seen yet (no key in the session), so the first fallback use is the first real test.

---

## Session 33 — Redesign: the remaining public pages

**Date:** 2026-10-09
**Scope:** Bring the category, topics, tag, author, search, profile, edit profile, sign in and sign up pages into the open-tab design from Session 32. Layout and styling only; every existing function kept.

**Built:**

- `PageHead.svelte`: the shared page heading (kicker, count, big serif title, italic line, optional avatar). Used on category, topics, tag and author pages.
- Category, tag, author and search results now list stories as `StoryRow` rows (the "Keep reading" row from the post page) under a section ear. Category pagination restyled with 44px buttons.
- Topics page is now a numbered index: topic name, colour mark, story count.
- Search: large serif field on a heavy rule, prompt and no-results states restyled.
- Profile: new header, action row (edit, newsletter, sign out), activity lists as dark tabs on a heavy rule, rows with thumbnails. The nested `<main>` inside the public layout is now a `<section>`.
- Sign in, sign up, edit profile: masthead band with the wordmark (sign in and sign up), dark tab heading, and a shared "form kit" in `app.css` (`.form-kit`): 48px fields, 10px radius, accent error states, ink buttons. Emoji show/hide password buttons replaced with drawn eye icons.
- Category colours now appear only as small dots next to the topic name, as the brief asked.

**Follow-ups from review (same session):**

- Featured carousel shows every published post marked as featured (`getFeaturedPosts()` no longer takes a fixed 4). Falls back to the 4 newest posts if none are featured. The tab row scrolls and follows the open story when there are many.
- Site tagline removed from the masthead.
- Story titles turn the accent colour on hover instead of underlining.
- Text links keep the surrounding text colour, with a 3px accent underline (article body, sign in/up, search, profile, "More in …", "Filed under", newsletter).

**Removed:** `PostCard`, `SmallCard`, `CategoryPill`, `AuthorByline` (nothing used them after this change).

**Noted, not changed:** `CategoryFilterBar.svelte` was already unused before this session.

**Assumptions / not done:**

- The new design file only drew home and article. These pages reuse its parts rather than following a drawn design.
- No "Forgot password" link: the reset flow doesn't exist yet (brief section 6.12).
- Newsletter landing, newsletter setup, unsubscribe and 404 pages not touched in this session.
- Checked with sample data on a temporary page (deleted), at 1280px and 390px. Not checked against the live database.

---

## Session 32 — Redesign: the open tab (home and post pages)

**Date:** 2026-10-08
**Scope:** Build the Claude Design handoff "Open Tabs Redesign" (round 2 home, round 1 article) into the public site. Keep every existing reader feature and restyle it.

**Built:**

- New colour and type system in `app.css`: paper and ink with one burnt orange accent (light and dark), Newsreader for headlines and article text, Instrument Sans for the interface. Article prose, drop cap and pull quotes restyled.
- Masthead (`Navbar.svelte`): wordmark, tagline, search, theme button, account, and a scrolling tab strip of categories. The page you're on is the open tab (home, category, or the category of the post being read). It is no longer fixed to the top. Phones get a menu button holding search, authors and account links.
- Skip-to-content link on every public page.
- Home: featured carousel with numbered tabs and arrows (swipes on phones), Trending (now 5 stories), category sections with a lead story and two more, Latest stories as category plus title.
- Post page: new header, 1100px cover, 680px text, "Filed under" tags, "Keep reading" list. TL;DR, bookmarks, sharing, author card, newsletter and comments kept and restyled.
- New components: `StoryCover` (cover image, or a blank tab with the category name when there's no cover), `TrendingList`, `CategorySection`, `StoryRow`. Section heads are now the dark "ear" on a heavy rule.
- Footer restyled. Authors moved there (and into the phone menu) since the desktop nav no longer has an Authors dropdown.

**Decisions:**

- Carousel no longer auto-plays. The design has none.
- Category colour pills are not used on the redesigned pages (one accent only, per the design). `CategoryPill` stays for the category, search, author and tag pages.
- Removed `TrendingCard` and `TagChip`, which nothing used after this change.

**Assumptions / not done:**

- Category, search, author, tag, profile and login pages pick up the new colours and fonts but keep their old layouts. Some still use the monospace font for small labels.
- Wide images inside articles don't break out to 1100px yet; the editor has no way to mark an image as wide.
- `CLAUDE.md` still points to the old v2 design file as the design source.
- Checked with sample data on a temporary page (deleted). Not checked against the live database.

---

## Session 31 — Claude Design Brief (Private Pages)

**Date:** 2026-10-08
**Scope:** Prompt for redesigning the reader profile pages and the whole dashboard, with first-party analytics removed. Prompt only, no site code changed.

**Built:**

- `docs/claude-design-brief-private-pages.md`: roles and access table, what is being removed, direction, fixed rules, every reader and dashboard screen with its states, component kit, copy rules, sample content, delivery order.

**Findings from reading the admin code:**

- **Roles:** reader, author, admin. Authors reach only Dashboard, Posts and Analytics, and see only their own posts. Everything else is admin-only (hooks list plus per-page checks).
- **Gap:** `/profile/edit` tells authors and admins to use "Dashboard, Settings, Account", but Settings is admin-only, so they are redirected. Neither authors nor admins have a working place to edit their own name, username or photo through the UI. The brief asks for a "My account" page for all dashboard roles.
- **First-party analytics (Tinybird) feeds:** the Analytics page, the traffic and audience widgets on the dashboard home, the user activity timeline, the Logs page, the "errors in the last hour" menu badge, and `/api/track`, plus the pageview logging in `hooks.server.ts`. Content counts, user counts, subscriber counts and email stats come from our own database and stay.
- Logs reads from the same store, so its fate is undecided. The brief includes a compact version marked "may be removed".

**Corrections to earlier docs:**

- The public brief said "about 20 published stories". The real count is 43.
- The design audit said the editor saves no alt text. It does ask for alt text on image insert and has an ALT button (added 5 October). The real gap is old posts and no warning before publishing. Audit item 3 reworded.

**Deferred:** removing the analytics code, Tinybird files and tracking calls; the "My account" page; the pre-publish checklist; fixing `/profile/edit` for authors; user search and role filter.

---

## Session 30 — Claude Design Brief (Public Pages)

**Date:** 2026-10-08
**Scope:** Write the prompt for a full redesign of the public pages in Claude Design. Prompt only, no site code changed.

**Built:**

- `docs/claude-design-brief-public-pages.md`: direction, fixed rules, free choices, a page-by-page spec (shell, home, article, category, topics, tag, author, search, sign in and sign up, newsletter pages, profile, 404), component kit, token list, copy rules, real sample content, and delivery order.

**Decisions:**

- Fixed from `CLAUDE.md` and the audit: drop cap, reading progress bar, 896px and 680px widths, separate mobile layout, light and dark, AA contrast, 12px text floor, skip link, no cut-off titles.
- The brief asks for a new set of category colours, shown as marks beside dark text instead of coloured text on a tint.
- The brief includes pages that do not exist yet (About, Contact, Privacy, Terms, Forgot and Reset password) so the design covers them.
- The old design file URL in `CLAUDE.md` still returns 404. Once a design is chosen, its tokens become the design source of truth and `CLAUDE.md` needs updating.

**Deferred:** admin dashboard redesign; building any of the redesign; backend for password reset and the new text pages; fixing the "Behind Behind" typo in the live "$8 Billion" headline.

---

## Session 29 — Design Audit (Taste Skill)

**Date:** 2026-10-08
**Scope:** Install the Taste Skill `redesign-skill` and use its checklist to audit the public site. Audit only, no site code changed.

**Built:**

- `.agents/skills/redesign-skill/SKILL.md`, copied by hand from `Leonxlnx/taste-skill` (read in full first: plain text, no scripts). Not added to `skills-lock.json`.
- `docs/design-audit-2026-10-08.md`: findings in priority order, what already passes, and which of the skill's advice not to follow.

**Decisions:**

- Did not apply the skill's font swap, grain, photo-background or parallax advice. It conflicts with the design rules in `CLAUDE.md` and with the editorial reading experience.
- Contrast was calculated from the real category colours rather than judged by eye.

**Assumptions / not done:**

- `npx skills add` was blocked in this session, so the skill was copied by hand. Running the installer later would add the lock-file entry.
- Admin screens were checked in code only. No screen-reader test, speed test or live-site check.
- Nothing from the audit has been fixed yet. Top items: category label contrast, hero label legibility, missing alt text on article images, no skip link, no privacy/terms/about pages.

---

## Session 28 — TL;DR Box (Trial)

**Date:** 2026-10-07
**Scope:** Trial of a short bullet summary at the top of a post. One post only, to judge look and wording before deciding on automation.

**Built:**

- **`posts.tldr`** (text array, nullable) and migration `0015_new_cargill.sql`. A single `ADD COLUMN`, safe to apply to live data.
- **`TldrBox.svelte`** shows the bullets between the cover image and the first paragraph. It reuses the open-tab label from the section headings. It only renders when a post has a TL;DR.
- `getPostBySlug` and `PostDetail` now carry `tldr`.

**Decisions:**

- The summary for the latest post (Dry Kaveri) was written by hand as a stand-in for the model. Four bullets, plain sentences, figures taken from the article, no em dashes.
- The box sits outside `<article>`, so the drop cap and the reading progress bar are unchanged.

**Assumptions / not done:**

- No OpenRouter call yet. Nothing writes `tldr` from the editor or on publish.
- The summary was saved on a Neon test branch (`tldr-trial`), not on the main database. The live post shows no box until the migration is deployed and the bullets are saved there.
- No admin field to edit a TL;DR by hand yet.

**Verification:**

- Rendered the post against the test branch at 1280px and 390px, light and dark.
- `pnpm typecheck` 0 errors. `pnpm build` passes. Prettier and ESLint clean on the changed files; 11 other files already fail `prettier --check` and were left alone.

---

## Session 27 — Tab Motif, Round Two (Impeccable)

**Date:** 2026-10-05
**Scope:** Carry the Session 26 tab idea through the rest of the public site, and remove the small label above headings that the style audit flagged.

**Built:**

- **Trending cards.** Rank number is now a tab hanging from the top edge of the image (dark numeral on orange, which passes contrast; the old white on orange did not). Hover zooms the image slowly and turns the title orange instead of dimming the whole card.
- **Newsletter.** Removed the small "Newsletter" label above the heading in the embedded form (both logged-in and logged-out states) and "The Newsletter" on the `/newsletter` page. The "Subscribed" confirmation label stays.
- **Article page.** Related stories heading is now "Keep these tabs open" (was "More from <category>").
- **404 and error page.** Headings now read "This tab has closed." and "This tab stopped loading." Body copy names the problem and the next step.

**Assumptions / not done:**

- The navbar active link keeps its orange underline. A tab shape there needs the bar height reworked and was not attempted.
- Design file URL in CLAUDE.md still 404s, so nothing was compared with `Open Tabs v2.html`. Seed posts still have no cover photos.
- The "Keep these tabs open" wording is a brand-voice choice and is easy to revert in one line if the team prefers the category name.

**Verification:**

- Rendered home, a full article and the 404 page against a throwaway in-memory database (not committed). Newsletter page checked in Session 25 setup only through the shared component.
- `pnpm check` 0 errors, 23 warnings (unchanged). `eslint src` clean. `pnpm build` passes. Impeccable detector: 0 findings on changed files.

**Deferred:** real cover photos under the tab strip; navbar tab; a second look at the admin screens.

---

## Session 26 — Tab Strip Signature (Impeccable)

**Date:** 2026-10-05
**Scope:** Make the public site more distinctive without changing its identity. Kept the cream / ink / orange palette and Playfair Display + DM Sans. Added one idea taken from the name: Open Tabs, so the interface reads as a set of open browser tabs.

**Built:**

- **Home hero (`CarouselHero.svelte`).** Replaced the dots and arrow buttons with a tab strip across the top of the hero. Each featured story is a tab (number plus truncated title). The active tab is lifted in the page colour and carries a thin orange timer line that drives autoplay. Autoplay pauses on hover and on keyboard focus. Left and right arrow keys move between tabs. The strip scrolls sideways on mobile. Hero headline is larger (up to 3.1rem), and the byline and subtitle text contrast was raised.
- **Fixed a hero bug.** The old active dot was painting its touch-padding, so it showed as a large orange block. The dots are gone, so the bug is too.
- **Reduced motion.** Autoplay is now driven by the timer animation ending, so users who prefer reduced motion get no autoplay at all (the global reduced-motion rule removes that animation).
- **Section headings (`SectionHead.svelte`).** The label is now a filled tab sitting on a full-width rule (Trending, Latest, category sections, related posts, comments). The old short label plus thin line is gone.
- **Home page entrance.** One staggered rise-in for the hero and the first three sections (0.8s, ease-out, content visible by default).
- **Latest list.** Hover now shifts the title right and turns it orange instead of dimming the row.
- **Article page.** Headline is bolder and larger (600 weight, up to 3.4rem, tighter tracking).

**Assumptions / not done:**

- The design source URL in CLAUDE.md still returns 404, so these changes were judged against the existing site, not `Open Tabs v2.html`.
- The seed posts have no cover images, so hero and card photos were reviewed as placeholders only. Real cover photos under the new tab strip are unchecked.
- Not changed: navbar, footer, newsletter block, trending cards, admin screens, login pages.
- Did not run the Impeccable "replace the visual world" flow (directions, comps, decision page). The identity is pinned by CLAUDE.md. `PRODUCT.md` and `DESIGN.md` still do not exist.

**Verification:**

- Rendered the home and article pages at 1440px and 390px, and the home page in dark mode, against a throwaway in-memory database (never committed). Clicked tabs and used the arrow keys in a real browser.
- `pnpm check` 0 errors, 23 warnings (unchanged). `eslint src` clean. `pnpm build` passes. Impeccable detector: 0 findings on the changed files.

**Deferred:** autoplay timing (6s per tab) is a guess; adjust once real covers are in. Tab strip with 5 or more featured posts relies on sideways scroll and was not tested.

**Update when merged with `main`:** the tab-strip hero in this session was dropped. `main` already has the peek-style carousel the owner approved (Session 23), so that version was kept. The hero text contrast bump from this session (subtitle and byline) was applied to the peek carousel. Everything else in this session stays.

---

## Session 25 — Style Audit Fixes (Impeccable)

**Date:** 2026-10-05
**Scope:** Ran the Impeccable style audit (static code scan plus its detector over `src/`, score 12/20) and fixed the accessibility and consistency problems it found. No schema changes, no new features.

**Fixed:**

- **Contrast.** `--ink-30` darkened to `#72665b` in light mode (3.6:1 to 5.0:1) and lightened to `#8f857b` in dark mode (2.7:1 to 5.2:1). New `--accent-ink` token (`#a0500c` in light mode, same orange as `--accent` in dark mode) used for orange text on cream surfaces, which was 2.6:1 with `--accent`. Switched every `color: var(--accent)` on public, newsletter, profile and error pages to `--accent-ink`. `--accent` stays for fills, borders and decoration. The drop cap now uses `--accent-ink`.
- **Keyboard focus.** Added a global `:focus-visible` ring (2px, `--accent-ink`). Removed `outline: none` from the navbar search inputs and the search page input, which had no other focus style. Other text inputs keep their existing border-colour focus style.
- **Reduced motion.** Replaced the blanket 0.01ms override with one that removes animation and movement but keeps short colour and opacity transitions so state changes stay visible.
- **Selection, caret, scrollbar.** Selection uses the accent at 32%, caret is accent, Firefox scrollbar colour set from the border token. Headings use `text-wrap: balance`.
- **Article blockquote.** Removed the 3px coloured left border and tinted box. Now a large accent quote mark above larger italic text. The admin editor blockquote matches.
- **Admin side borders.** Removed 3px coloured left borders on `StatCard`, dashboard KPI cards and the analytics growth card (full 1px accent border or outline instead).
- **Status colours.** Replaced hard-coded `#dc2626`, `#ef4444`, `#22c55e`, `#16a34a`, `#f59e0b`, `#d97706` in 8 admin files with the status tokens. Added `--color-status-error`. The greens and ambers shift slightly to match the existing published/scheduled tokens.
- **Width animations.** Reading progress bar and the two analytics bar charts now animate `transform: scaleX()`. Removed the sidebar `width` transition (it only fired on window resize).

**Assumptions / not done:**

- The design source URL in CLAUDE.md returned 404 from this sandbox, so `Open Tabs v2.html` was not re-checked. Identity was kept as is: cream, ink, orange, Playfair Display, DM Sans, the section-heading rule, italic serif headings.
- Not touched: ~180 hard-coded hex colours still in `.svelte` files (mostly admin emails, users and categories pages); the two parallel token sets in `app.css` (`--ink` vs `--color-ink`, `--serif` vs `--font-display`); unicode characters used as icons; touch target sizes (needs a browser check on a real device).
- No `PRODUCT.md` or `DESIGN.md` exists yet. `/impeccable init` would create them.

**Verification:**

- `pnpm check` 0 errors, 23 warnings (same count as before). `eslint src` clean. `pnpm build` passes.
- `prettier --check` still lists 9 files; the same 9 failed before this session.
- Rendered `/newsletter` in light and dark and confirmed text is legible. Home, article and admin pages were not rendered (no `DATABASE_URL` in this sandbox).

**Deferred:** a bolder visual pass on the home page and article page. Needs the design file or a database to view real content.

---

## Session 24 — SEO Audit Fixes

**Date:** 2026-10-05
**Scope:** Fixes from a full SEO audit of the live site. Only the homepage was indexed in Google Search Console after 4+ months (oldest post is 26 May 2026).

**Built:**

- Head tags now have one owner. `(public)/+layout.svelte` writes title, description, canonical, Open Graph, Twitter and robots tags from each page's `seo` load data. Post, author, category, tag and search pages no longer repeat them. Before, post pages sent description, canonical and `og:*` twice, with `og:type` saying both `website` and `article`.
- Canonical URL is now `origin + path` (plus `?page=N` only). Filter or tracking query strings no longer end up in it.
- Every page gets `max-image-preview:large` (Google Discover) unless it sets its own `seo.robots`. Pages without their own image fall back to the site OG image.
- Post meta description: excerpt, then subtitle, then the start of the article, cut to 160 characters. Before it could be empty or over 160. Article structured data now carries the description, an image array, real dates, an author link, and a headline cut to 110 characters. Empty fields are left out instead of sent as `""`.
- Tag pages with fewer than 4 posts are `noindex, follow`. The sitemap lists only tags with 4+ posts (`MIN_INDEXABLE_TAG_POSTS` in `src/lib/utils/seo.ts`), and only categories and authors that have published posts.
- Sitemap `lastmod` is the real newest post update for each page, not today's date.
- Homepage has an H1 (visually hidden, site name and tagline).
- Removed the Svelte scaffold favicon link from `src/routes/+layout.svelte`. Google could show it in search results.
- Editor: tag input stops at 5 tags, refuses names that match a category, and explains the 4-post rule. Image insert asks for alt text, and a new ALT button edits alt text on a selected image.
- Admin Tags page: "merge into another tag" action (moves posts, then removes the source tag) and an "Under 4 posts only" filter, so the 231 existing tags can be cleaned up.

**Decisions:**

- No topics page. Categories already do that job.
- Page title for posts stays as the post title alone (no site name added), because most titles are already over 60 characters.

**Follow-up (same day):** deleted `static/robots.txt`. On Cloudflare Pages a static file wins over `src/routes/robots.txt/+server.ts`, so the live robots.txt had no Sitemap line. The route is now served, with the sitemap line and the Disallow rules. Sitemap cache cut from 1 hour to 5 minutes, since the blog publishes 3-4 posts a day.

**Needs a person:**

- `src/lib/assets/favicon.svg` is now unused and can be deleted.
- Submit `https://blog.indexdaily.in/sitemap.xml` in Search Console and Bing Webmaster Tools. Run URL Inspection on one post, and check Cloudflare security events for Googlebot.
- Run the tag cleanup in the dashboard (merge singles into broader tags).

**Deferred:**

- About, Contact, Editorial policy and Privacy pages. They need real content from the owner.
- A separate SEO title and persisted OG/Twitter fields. Needs a schema change and migration. Needed to shorten the 38 titles over 60 characters.
- Per-tag intro text and tag page pagination.
- Alt text on the 43 existing posts. Each image needs to be described by hand.
- Three trackers load on every page (Tag Manager, GA4 directly, Umami). Check that GA4 is not counted twice.

## Session 23 — Carousel Redesign, End Dot, Editor Fixes, SEO Previews

**Date:** 2026-10-05
**Scope:** Five UI/editor changes requested in one pass.

**Built:**

- `CarouselHero.svelte` — "peek" carousel. Active card is large and rounded, the next card shows at the right edge. Thin progress bars replace the dots, slides glide sideways, arrows are frosted and appear on hover or keyboard focus (hidden on touch screens), swipe works. Auto-play (5 s per slide) pauses on hover or focus and stops for good once the reader moves it. Auto-play is off for `prefers-reduced-motion`. The category pill is no longer nested inside the card link (the old markup nested one `<a>` in another). Mobile uses a taller 4:5 card, separate from the desktop 16:9 card.
- Post page end dot (`posts/[slug]/+page.svelte`) — moved from below the author card to directly under the last line of the article body, and changed from a small `·` text glyph to a 14px filled circle in the accent colour.
- Post editor publish bug (new post page) — the status hidden input is updated by Svelte after a short delay, so clicking Publish submitted the old value (`draft`). The edit page already set `status` at submit time; the new page now does the same.
- Post editor "Author is required" error — the Meta and SEO tabs were swapped with `{#if}`, so the author select (and category select) did not exist while the SEO tab was open. Both tabs now stay mounted and are hidden with CSS, on both the new and edit pages.
- `SeoPanel.svelte` — live Google search preview (always visible), a fuller Open Graph card and a Twitter/X large-image card. Empty OG/Twitter fields fall back to post title, excerpt and cover image (Twitter checks OG first, then the post defaults). Site host comes from `PUBLIC_SITE_URL`, falling back to `blog.indexdaily.in`.

**Decisions:**

- Keeping the tabs mounted also fixes a second bug of the same cause. On the edit page the excerpt hidden input lived inside the SEO tab, so any save (including the 3 s auto-save) from the Meta tab sent no excerpt and wiped it. Category on the edit page had the same problem when saving from the SEO tab.
- The end dot is assumed to belong right after the article text, centred. The design file could not be read (see below), so this is an assumption.
- The Open Tabs v2 design link (`api.anthropic.com/v1/design/...`) returned 404 from this environment. Carousel and previews use the tokens already in `app.css`, not the design file.

**Deferred / Known issues:**

- OG and Twitter title/description fields are not stored anywhere (no columns in `posts`). They only drive the preview. Saving them needs a schema change and migration.
- The edit page sends `authorId` but `save` ignores it, so changing the author on an existing post does nothing.

## Session 22 — Sign-Out 415 Error

**Date:** 2026-07-22
**Scope:** Fix reported bug — signing out hit `https://blog.indexdaily.in/api/auth/sign-out` and returned `{"code":"UNSUPPORTED_MEDIA_TYPE", ...}`.

**Root cause:** all 4 sign-out buttons in the app (`Navbar.svelte` desktop dropdown, `Navbar.svelte` mobile menu, `(admin)/+layout.svelte`, `(public)/profile/+page.svelte`) POSTed directly to Better Auth's own REST endpoint `/api/auth/sign-out`. That endpoint only accepts `application/json` bodies — it's designed for programmatic `fetch()` calls, not native HTML forms. Native `<form>` submits default to `application/x-www-form-urlencoded`, which Better Auth rejects with 415 before the handler even runs.

- The two `Navbar.svelte` forms had no `use:enhance` at all, so they were genuine full-page browser navigations — Better Auth's raw JSON error rendered directly in the browser (the exact symptom reported).
- `(admin)/+layout.svelte` and `(public)/profile/+page.svelte` both had `use:enhance`, but their custom submit callbacks either ignored the fetch result entirely (admin — always called `goto('/login')` regardless of what the server returned) or checked a `result.type === 'redirect'` condition that a raw `+server.ts` 415 response would never satisfy (profile). Both were masking the identical failure — the session was very likely never actually invalidated server-side in either case, since the request never reached Better Auth's handler, it just looked like sign-out worked because the client-side navigation ran unconditionally.

**Fix:** added `src/routes/api/sign-out/+server.ts` — a project-owned endpoint that calls `auth.api.signOut({ headers: request.headers })` directly (same pattern already used by `login`/`register` calling `auth.api.signInEmail`/`signUpEmail` server-side, rather than hitting Better Auth's REST surface from the client). It reads an optional `redirectTo` form field (validated to same-origin relative paths only — `startsWith('/') && !startsWith('//')` — to avoid an open-redirect), defaulting to `/login`, then issues a real `redirect(302, ...)`. All 4 forms now point at `/api/sign-out` instead of `/api/auth/sign-out`; the profile page form gained a hidden `redirectTo=/` input to preserve its original "go home after sign out" behavior (the other 3 correctly default to `/login`).

**Decisions:**

- Chose a new project-owned endpoint over trying to make Better Auth's own endpoint accept form-encoded bodies (not configurable) or switching every sign-out button to a client-side JSON `fetch()` call (more moving parts, diverges from this codebase's established convention of calling `auth.api.*` server-side).
- `auth.api.signOut` doesn't throw on a missing/invalid session cookie (verified by reading Better Auth's source — it just skips DB deletion and still clears the cookie), so no try/catch needed around that call.

**Verification:**

- `pnpm typecheck` → 0 errors (23 pre-existing-pattern warnings).
- `eslint .` (direct) → 0 errors.
- Hit the new endpoint directly with `curl`, reproducing the exact original bug report's content-type (`application/x-www-form-urlencoded`, empty body) — got a clean `302 Found` with `Location: /login` instead of a 415. Also confirmed the `redirectTo` field is honored (tested `redirectTo=/` → `Location: /`) and that requests with no session cookie still succeed gracefully.
- Could not test the full logged-in-session round trip (no DB in this sandbox), but the endpoint behavior itself is directly verified working.

**Deferred:** none new.

---

## Session 21 — Stale Subscription Status + Dark Mode Input Contrast

**Date:** 2026-07-22
**Scope:** Two bugs reported after Session 20 shipped: profile page showing "Not subscribed" for an actually-subscribed user, and unreadable form inputs in dark mode across login/register/newsletter pages.

**Root cause 1 — profile always shows "Not subscribed":** `src/lib/server/auth/index.ts`'s Better Auth `user.additionalFields` never declared `isNewsletterSubscriber` or `resendContactId`. Better Auth's `getSession()` only returns fields it knows about; anything not registered as an additional field is simply absent from `authSession.user`. In `hooks.server.ts`, `isNewsletterSubscriber: (u.isNewsletterSubscriber as boolean) ?? false` therefore defaulted to `false` on every request — the only path that got the real value was the `if (!role)` legacy-session fallback, which explicitly re-queries the DB and doesn't fire for normal sessions (they already have `role`). This wasn't a display-only bug: `profile`'s `toggleNewsletter` action and `subscribe-me`'s "already subscribed" check both branch on this same always-`false` value, so a subscribed user clicking what the UI (wrongly) labels "Subscribe" would re-run the subscribe flow instead of no-op'ing, and could never reach the unsubscribe path from that button.

- Fix: added `isNewsletterSubscriber: { type: 'boolean', required: false, defaultValue: false, input: false }` and `resendContactId: { type: 'string', required: false, input: false }` to `additionalFields`, matching the existing `role`/`avatarUrl` pattern. No caching layer involved (no `cookieCache` configured) — this was a pure missing-field-declaration bug, not a staleness/invalidation problem.

**Root cause 2 — unreadable inputs in dark mode:** `login`, `register`, `newsletter/setup`, `profile/edit`, and the new `newsletter` landing page all hardcoded `background: white` on text inputs while `color: var(--ink)`. `--ink` is theme-aware and flips to near-white (`#e4ddd6`) in dark mode — white text on a white background. The already-shipped small `NewsletterForm.svelte` widget (embedded on home/post pages) never had this bug because it used `background: var(--cream)` instead, which flips to near-black in dark mode alongside the page shell.

- Fix: changed `background: white` → `background: var(--cream)` in all 5 files. Light mode is visually unchanged (`--cream` ≈ `#f7f3ed`, close to white); dark mode now renders dark input fields with light, readable text.

**Verification:**

- `pnpm typecheck` → 0 errors (23 pre-existing-pattern warnings).
- `eslint .` (direct) → 0 errors.
- Ran the dev server, forced `data-theme="dark"` via `document.documentElement.setAttribute`, and typed real text into the login and newsletter-landing email/password fields — screenshotted both, confirmed legible light-on-dark text where it was previously invisible.

**Deferred:** none new.

---

## Session 20 — Auto-Assigned Usernames + Resend Sync Diagnosability

**Date:** 2026-07-22
**Scope:** Two fixes on `/newsletter/setup` and `src/lib/server/resend.ts`. No schema changes.

**Built / Fixed:**

- Added `unique-username-generator` dependency.
- `src/routes/newsletter/setup/+page.server.ts` — new `generateAvailableUsername(email)`: derives a candidate from the email local-part via `generateFromEmail`, sanitizes to `[a-z0-9_]`, retries up to 5 times with increasing random-digit counts against a DB uniqueness check, falls back to `reader<base36-timestamp>` if all 5 collide. `load` now calls this when `email` is present and returns `username` in page data.
- `src/routes/newsletter/setup/+page.svelte` — username input now has `value={data.username}` (pre-filled, still editable — user can retype and the existing debounced availability check still runs on input). `usernameStatus` initializes to `'available'` when a username was generated, so the green checkmark shows immediately instead of requiring the user to touch the field.
- `src/lib/server/resend.ts` — `syncUserToResend` and `updateNewsletterSubscription` were silently no-op-ing (return `null`/`return`) on three separate conditions with zero logging: missing `RESEND_SEGMENT_ALL_USERS_ID`/`RESEND_SEGMENT_NEWSLETTER_ID`/`RESEND_TOPIC_NEWSLETTER_ID` env vars, `getResendClient()` returning `null`, and `resend.contacts.create()` returning an `error`. All four paths now call `logger.warn` with the specific missing config or API error before returning, so `/dashboard/logs` will surface exactly why a contact never reached Resend instead of failing invisibly.

**Root cause found (reported bug: subscriber emails not appearing in Resend audience/topics):** user confirmed via screenshot that `RESEND_SEGMENT_ALL_USERS_ID`, `RESEND_SEGMENT_NEWSLETTER_ID`, `RESEND_TOPIC_NEWSLETTER_ID`, `RESEND_WEBHOOK_SECRET`, `RESEND_FROM_NAME` are all present as encrypted secrets in Cloudflare Pages — ruling out the missing-env-var theory. Real cause: **every Resend sync call was fire-and-forget (`void (async () => {...})()`) with no `platform.ctx.waitUntil()`.** On Cloudflare Workers/Pages Functions, an unawaited promise is not guaranteed to run to completion once the response has been sent — the isolate can be frozen/recycled immediately after flush. The DB write (`isNewsletterSubscriber: true`) happens synchronously before the response, so it always persists; the Resend sync happens after, unawaited, so it can be killed mid-flight in production while looking fine in any environment where the runtime doesn't enforce that boundary (local dev, tests). This codebase already knew about this exact class of bug — `hooks.server.ts` wraps pageview logging in `event.platform?.ctx.waitUntil()` for the same reason (documented in `docs/architecture.md`) — but the newsletter Resend calls were never given the same treatment.

**Fixed in 4 places**, all changed the same way: added `platform` to the handler's destructured params, wrapped the fire-and-forget promise(s) in `platform?.ctx.waitUntil(...)`.

- `src/routes/api/newsletter/subscribe-me/+server.ts` — contact sync + welcome email.
- `src/routes/newsletter/setup/+page.server.ts` — contact sync + welcome email (both were racing the `redirect(302, ...)` at the end of the action, same failure mode).
- `src/routes/(public)/profile/+page.server.ts` (`toggleNewsletter` action) — contact sync / segment update.
- `src/routes/register/+page.server.ts` — contact sync (the two welcome emails in this file were already `await`ed, so they didn't need this).

No user action needed for this part — it was a code bug, not a config gap. The env vars the user already set are exactly what's needed now that the sync calls are actually allowed to finish.

**Decisions:**

- `generateAvailableUsername` scoped to `newsletter/setup` only, not `register` — user confirmed scope explicitly rather than applying to both.
- Truncation in the sanitizer keeps the trailing random digits and cuts the front (name) portion when over 20 chars — an initial version sliced from the end, which meant every retry attempt for a long email local-part truncated to the exact same candidate (the varying digits are appended at the end by the library, so tail-cutting always removed them). Caught before shipping via a standalone Node script testing sample emails, not caught by typecheck/lint since it's a runtime logic bug, not a type error.
- Username field stays editable after auto-fill (not locked/readonly) — auto-assign removes typing friction but a subscriber who wants a specific handle can still change it; the debounced availability check still guards the submit.

**Verification:**

- `pnpm typecheck` → 0 errors (23 pre-existing-pattern warnings).
- `eslint .` (direct) → 0 errors.
- Standalone Node script against 5 sample emails (short, all-digit, dotted, plus-addressed, very-long local-part) confirmed all candidates match `/^[a-z0-9_]{3,20}$/` and that retries actually vary.
- Could not live-test the DB uniqueness-retry loop or the Resend sync logging end-to-end — this sandbox has no `DATABASE_URL`/Resend credentials (same limitation as Session 19).

**Deferred:** none new.

---

## Session 19 — Newsletter Landing Page

**Date:** 2026-07-22
**Scope:** Standalone Substack-style newsletter landing page (`/newsletter`), discoverable from Footer. No changes to existing subscribe/setup API logic — reuses it as-is.

**Built:**

- `src/routes/newsletter/+page.server.ts` — new. Loads `locals.user`; returns `isLoggedIn`, `isSubscribed` (`user.isNewsletterSubscriber`), `email` (`user.email` or `''`).
- `src/routes/newsletter/+page.svelte` — new. Standalone page (outside `(public)` group, no navbar/footer — same convention as `login`/`register`/`newsletter/setup`). Masthead (`Open Tabs` wordmark), eyebrow label, serif italic hero heading, description, email + Subscribe form, "what you get" bullet list (reuses copy voice from `newsletter-welcome.tsx`). Three top-level states:
  - **Already subscribed** (logged in, `isSubscribed`) — confirmation block + link to `/profile`, no form shown.
  - **Success** — post-subscribe confirmation.
  - **Idle/form** — email input (`readonly` + pre-filled with `data.email` when logged in, since the actual subscribe call always uses the session, not the typed value) + Subscribe button; `has_account` sub-state with "Log in to subscribe" link, mirroring `NewsletterForm.svelte`.
  - Logged-in submit → `POST /api/newsletter/subscribe-me` (session-based, existing endpoint, unchanged). Logged-out submit → `POST /api/newsletter/subscribe` (existing endpoint, unchanged) — `setup_required` still redirects to `/newsletter/setup?email=...` to create password/profile; `has_account`/`already_subscribed` handled identically to the existing embedded widget.
  - Responsive: form stacks vertically under 520px (same breakpoint as `NewsletterForm.svelte`).
- `src/lib/components/blog/Footer.svelte` — added "Newsletter" link to the Pages column, pointing to `/newsletter` (previously not linked from anywhere in the public UI).

**Decisions:**

- No new API endpoints — the landing page is a UI wrapper around the two existing, already-battle-tested endpoints (`/api/newsletter/subscribe`, `/api/newsletter/subscribe-me`). Avoids duplicating subscribe/account-creation logic a second time.
- Logged-in email field is `readonly` rather than hidden — satisfies "auto-populate the field" while preventing a user from typing a different email that the subscribe-me call would silently ignore (it always subscribes the session's own account).
- Standalone route (no site chrome) chosen to match sibling routes `newsletter/setup`, `login`, `register` — consistent "single-purpose page" pattern already established in this codebase, cheaper than adding a new page variant to the `(public)` layout.

**Verification:**

- `pnpm typecheck` → 0 errors (22 pre-existing-pattern warnings, 3 new ones follow the same `state_referenced_locally` pattern already present in ~9 other files — not a regression).
- `eslint .` (direct) → 0 errors.
- Verified in browser at 1440×900 and 390×844 — layout matches design tokens used elsewhere (serif/ui/mono fonts, ink/cream/accent colors), form stacks correctly on mobile, no visual overflow.
- Submitted the anonymous form live: request reached `POST /api/newsletter/subscribe`, JSON parsed, error state rendered without crashing. The 500 returned was `DATABASE_URL is not set` — this sandbox has no dev DB credentials configured, unrelated to this change. Could not verify the live DB-backed `setup_required` redirect or the logged-in one-click path end-to-end for that reason; logic is identical to the already-production-verified paths in `NewsletterForm.svelte`.

**Deferred:** none new. Prior deferred items (broadcast compose UI, Logs pagination) unchanged.

---

## Pre-Launch Check — Newsletter Feature Status

**Date:** 2026-07-22
**Scope:** Audit of newsletter feature ahead of public launch. Read-only review — no code changes made.

**Verified working (code + typecheck):**

- Anonymous subscribe (`POST /api/newsletter/subscribe`) — routes new emails to `/newsletter/setup`, existing-unsubscribed accounts to `has_account` message, already-subscribed to success. No zombie account creation (fixed session 18).
- `/newsletter/setup` — creates real account (Better Auth + username/password), sets `isNewsletterSubscriber`, syncs Resend, sends welcome email, redirects to `/profile?welcome=1&subscribed=1`.
- Logged-in one-click subscribe (`POST /api/newsletter/subscribe-me`) and profile toggle (`?/toggleNewsletter`) — both update DB + Resend segment/topic + fire welcome email where relevant.
- Unsubscribe: standalone `/unsubscribe` page + Resend webhook (`contact.updated`, `email.complained` → `isNewsletterSubscriber: false`); webhook also tracks `delivered/opened/clicked/bounced` into `email_sends`.
- Admin `/dashboard/newsletter` — stat cards, recent subscribers table, opt-in-on-register toggle all wired to real queries.
- Admin `/dashboard/emails` — template editor + live preview, send logs, delivery stats.
- `pnpm typecheck` → 0 errors (19 pre-existing warnings, none newsletter-related).
- `eslint .` (run directly) → 0 errors.

**Findings / gaps:**

1. **`docs/architecture.md` secrets table is stale.** Lists only `RESEND_API_KEY` — missing `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `RESEND_SEGMENT_ALL_USERS_ID`, `RESEND_SEGMENT_NEWSLETTER_ID`, `RESEND_TOPIC_NEWSLETTER_ID`, `RESEND_WEBHOOK_SECRET`, plus unrelated `CRON_SECRET`/`TINYBIRD_*`/`PUBLIC_R2_PUBLIC_URL`/`DIRECT_DATABASE_URL` that are all real requirements per `.env.example`/`worker-configuration.d.ts`. Risk: these are easy to forget in the CF Pages dashboard before launch — code fails soft (silent no-op via `if (!env.X) return null`) so nothing crashes, but Resend segment sync / webhook / newsletter sender identity would silently do nothing in prod if unset.
2. **Debug `console.log`/`console.error` left in `src/lib/server/resend.ts`** (`sendRegistrationWelcome`, `getResendClient`) — added while chasing a prod email bug, never removed. Not breaking anything, just noisy in CF Workers logs. Registration path only, but same file backs newsletter sends.
3. **Broadcast/compose newsletter UI still disabled** (`Compose Newsletter` button, `disabled title="Coming soon"` in `dashboard/newsletter/+page.svelte`) — explicitly deferred since session 13b, unchanged.
4. **Resend open/click tracking** requires manual per-domain enable in Resend dashboard (external action, not code) — noted in code comments, still outstanding.
5. **`pnpm lint` fails** — `prettier --check` flags 38 files including `resend.ts`, `register/+page.server.ts`, `track.ts`, `analytics.ts`. Diffed one file byte-for-byte identical content — looks like CRLF/LF line-ending noise from Windows checkout, not real formatting drift. `eslint` alone (bypassing prettier) is clean.

**Launch readiness verdict:** Newsletter feature is functionally complete and safe to ship — no code blockers found. Two pre-launch action items, both ops/config not code: (a) confirm all Resend env vars above are set in CF Pages prod + GitHub Actions secrets, (b) verify sending domain in Resend dashboard for deliverability + tracking. Recommend also stripping the debug logging in `resend.ts` before launch (finding #2) — cosmetic, not urgent.

**Deferred (unchanged from prior sessions):**

- Newsletter broadcast compose/send UI
- Pagination on Emails admin Logs tab

---

## Session 18 — Newsletter Subscription Flow (Session-Aware, Setup Page, Zombie Removal)

**Date:** 2026-05-27
**Scope:** Overhaul anonymous newsletter subscription — remove zombie account creation, add session-aware form modes, add `/newsletter/setup` registration-for-subscribers page.

**Built / Fixed:**

- `src/routes/api/newsletter/subscribe/+server.ts` — removed Path C (zombie account creation via `auth.api.signUpEmail` with random password). New Path C returns `{ status: 'setup_required', email }`. Updated Path B: if email exists and belongs to unsubscribed account, now returns `{ status: 'has_account' }` instead of silently subscribing (logged-in users use a different endpoint). Removed all imports no longer used: `auth`, `env`, `sendNewsletterWelcome`, `syncUserToResend`, `updateNewsletterSubscription`, `logger`.
- `src/routes/api/newsletter/subscribe-me/+server.ts` — new. POST, 401 if no session. Subscribes `locals.user` directly: DB update, Resend sync (fire-and-forget), welcome email. Uses existing `sendNewsletterWelcome` from `resend.ts`.
- `src/lib/components/blog/NewsletterForm.svelte` — added `user` prop (`{ id, name } | null`). Three render modes: (1) `isSubscribed=true` → renders nothing; (2) `user && !isSubscribed` → single "Subscribe" button calling `/api/newsletter/subscribe-me`, no email input; (3) anonymous → existing email form. Handles new API statuses: `setup_required` → `goto('/newsletter/setup?email=...')`, `has_account` → inline message with "Log in to subscribe →" link and "Use a different email" reset button. Added `has_account` to `FormState` union. Added `.nl-btn-standalone` style for the one-click button (full border-radius, standalone padding).
- `src/routes/(public)/+page.svelte` — `<NewsletterForm>` now passes `user={page.data.user ?? null}`.
- `src/routes/(public)/posts/[slug]/+page.svelte` — same.
- `src/routes/newsletter/setup/+page.server.ts` — new. Load: redirect logged-in users to `/profile`; redirect if email already has account to `/login?redirect=/profile`. Returns `{ email }`. Action `setup`: mirrors register flow — same `USERNAME_RE`, same field validation, same username uniqueness check, `auth.api.signUpEmail`, then DB update setting `isNewsletterSubscriber: true`, `newsletterSource: 'subscribe_form'`. Resend sync fire-and-forget. Sends newsletter welcome email. Redirects to `/profile?welcome=1&subscribed=1`.
- `src/routes/newsletter/setup/+page.svelte` — new. Placed outside `(public)` group (no nav/footer layout needed). Email displayed as read-only chip (`font-family: var(--mono)`) with hidden input carrying the value and "Use a different email" link to `/`. Fields: first name, last name, username (debounced availability check, same spinner/✓/✕ pattern), password with show/hide toggle. No newsletter checkbox — subscription is implicit. Submit label: "Complete subscription". Redirects to login if has account. Matches register page CSS exactly; adds `.email-chip` and `.email-change` styles.
- `src/routes/(public)/profile/+page.svelte` — added `isNewSubscriber = $derived(page.url.searchParams.get('subscribed') === '1')`. `dismissWelcome` also deletes `subscribed` param from URL. Banner copy appends "You're now subscribed to the Open Tabs newsletter." when `isNewSubscriber` is true alongside `isWelcome`.

**Decisions:**

- Anonymous subscriber → no account created at subscribe time. They complete signup at `/newsletter/setup`, which creates a proper account with name/username/password and sets `isNewsletterSubscriber: true`. Cleaner than zombie accounts; subscriber can log in, manage profile, unsubscribe from profile page.
- Path B (existing account, not subscribed) returns `has_account` rather than auto-subscribing. Reason: anonymous form should not modify accounts the submitter may not own. Logged-in path handles this via `/api/newsletter/subscribe-me`.
- `newsletter/setup` placed at `src/routes/newsletter/setup/` (not inside `(public)/`) so it gets no Navbar/Footer — same pattern as `register/` and `login/`.

**Deferred:**

- Nothing new deferred.

**Verification:**

- `pnpm typecheck` → 0 errors (16 pre-existing warnings, unchanged)
- `pnpm lint` → 0 errors (2 pre-existing warnings in auto-generated `worker-configuration.d.ts`)
- Deploy green ✓ (1m12s)

---

## Session 17 — Welcome Emails, React Email Templates, Template Editor, Delivery Tracking

**Date:** 2026-05-27
**Scope:** Full email feature — React Email HTML templates, DB-backed template editor in admin dashboard, email send tracking table, Resend webhook event tracking.

**Built / Fixed:**

- `src/lib/server/resend.ts` — full rewrite. Replaced `getResend()` with `getResendClient()` (reads `resend_api_key` from DB settings, falls back to env). Added `getFromAddress()` helper. Updated `syncUserToResend`, `updateNewsletterSubscription`, `updateResendContact` to use new async client; silent catches now log via `logger.warn`. Added `sendNewsletterWelcome()` and `sendRegistrationWelcome()` — render React Email template, send via Resend, log to `email_sends` table. Comment documents that open/click tracking must be enabled per-domain in Resend dashboard.
- `src/lib/email/newsletter-welcome.tsx` — added `headline`, `bodyText`, `siteUrl` props. When `bodyText` set, replaces multi-paragraph default with single text block. `siteUrl` replaces hardcoded `blog.indexdaily.in`. Fallback to existing hardcoded content when props absent.
- `src/lib/email/registration-welcome.tsx` — new template. Props: `firstName`, `siteUrl`, `loginUrl`. Matches existing design tokens exactly: `#fafaf7` bg, `#1a1a18` text, italic wordmark, `#c55a3a` CTA button (`border-radius: 6px`). Content: "Your account is ready." headline, explore + newsletter subscription mention, CTA to `siteUrl`.
- `src/lib/server/db/schema.ts` — added `emailSends` table: `id`, `resend_email_id`, `type`, `to_email`, `user_id`, `subject`, `last_event`, `sent_at`, `updated_at`.
- `src/lib/server/db/generate-id.ts` — added `'eml'` to `IdPrefix` union.
- `src/lib/server/queries/email-sends.ts` — new file. `logEmailSend`, `getEmailSends`, `getEmailSendStats` (counts by `lastEvent`), `updateEmailEvent`.
- `src/lib/types/index.ts` — added `EmailSend` type, added `email_nl_subject`, `email_nl_headline`, `email_nl_body`, `email_reg_subject` to `SiteSettings` interface.
- `src/routes/api/newsletter/subscribe/+server.ts` — removed inline `sendWelcomeEmail` plain-text function; replaced with `sendNewsletterWelcome()` from `resend.ts`. Added `logger.warn` catch.
- `src/routes/register/+page.server.ts` — removed inline plain-text email block; replaced with `sendRegistrationWelcome()`. Added `logger.warn` catch.
- `src/routes/api/webhooks/resend/+server.ts` — added handlers for `email.delivered`, `email.opened`, `email.clicked` calling `updateEmailEvent()`. Existing `email.bounced` now also calls `updateEmailEvent`.
- `src/routes/(admin)/dashboard/emails/+page.server.ts` — new. Load: fetches sends, stats, settings, renders both template previews as HTML strings. Actions: `saveNewsletterTemplate` (saves `email_nl_subject/headline/body`), `saveRegistrationTemplate` (saves `email_reg_subject`), `sendTestEmail` (renders template, sends to current user, prefixes `[TEST]` in subject).
- `src/routes/(admin)/dashboard/emails/+page.svelte` — new. Three tabs: **Templates** (form fields + `<iframe srcdoc>` live preview, refreshes on save), **Logs** (table with type/to/subject/status/sent columns, colour-coded badges), **Stats** (stat cards: Total Sent, Delivered, Opened, Clicked, Bounced).
- `src/routes/(admin)/+layout.svelte` — added "Emails" nav item after Newsletter (admin-only, phone/send icon).
- `tsconfig.json` — added `"jsx": "react"`, `"jsxFactory": "React.createElement"`, `"jsxFragmentFactory": "React.Fragment"` to support `.tsx` type-checking.
- `package.json` / `pnpm-lock.yaml` — added `react@19` (runtime peer dep for `@react-email/components`) and `@types/react@19` (dev, types for TSX files).
- `drizzle/migrations/0013_damp_fabian_cortez.sql` — migration for `email_sends` table. Applied to production.

**Decisions:**

- `getResendClient()` calls `getSettings()` on every send — adds one extra DB query per email, but ensures DB-configured API key is always preferred over env. Acceptable given email is an infrequent operation.
- `sendTestEmail` prefixes `[TEST]` in subject rather than sending to a separate address — keeps it simple, no extra config needed.
- Template preview rendered server-side on load and on save (via `use:enhance` + `update()`); no live client-side re-render on keystroke — sufficient for this use case, avoids complexity.
- `react@19` added as direct dep (was only a transitive peer dep in pnpm's isolated node_modules); `@types/react@19` added as dev dep. Both were already resolved in `.pnpm` store so no new downloads.

**Deferred:**

- Pagination on Logs tab (currently hardcoded limit 50).
- Resend open/click tracking requires manual enable in Resend → Domains → your domain → Settings (cannot be set per-send via API).

**Verification:**

- `pnpm typecheck` → 0 errors (16 pre-existing warnings, unchanged)
- `pnpm lint` → 0 errors (2 pre-existing warnings in `worker-configuration.d.ts`)
- `pnpm build` → clean build ✓
- Deploy green ✓ (1m36s, all steps passed including migration)

---

## Session 16 — Editor Polish, Search, Reading Time, Bookmark Byline

**Date:** 2026-05-27
**Scope:** 5 targeted improvements — no schema changes, no new routes.

**Built / Fixed:**

- `src/app.css` — list rendering fixed: added separate `.prose ul { list-style-type: disc }` and `.prose ol { list-style-type: decimal }` rules; Tailwind preflight was resetting list-style globally. Blockquote redesigned: tinted background (`color-mix 6%`), `border-radius: 0 6px 6px 0`, serif italic paragraph, decorative `"` glyph via `::before` (4rem, 40% opacity). Pull quote redesigned: centred layout, top/bottom 1.5px accent borders, large 5rem opening quote glyph, `clamp(1.375–1.75rem)` serif italic, `color: var(--ink)` (was ink-60).
- `src/lib/components/admin/TiptapEditor.svelte` — editor list rules split into separate `:global(.editor-body ul)` and `:global(.editor-body ol)` blocks with `list-style-type` set. Blockquote editor mirror updated to match new prose design. Bubble menu gains bullet list (`≡`) and ordered list (`1.`) buttons. Toolbar gains pull quote button (`❝—`) that calls `insertContent({ type: 'blockquote', attrs: { class: 'pull-quote' }, content: [{ type: 'paragraph' }] })`. `updateActiveFormats` tracks `'pullQuote'` via `editor.isActive('blockquote') && editor.getAttributes('blockquote').class === 'pull-quote'`.
- `src/lib/components/blog/Navbar.svelte` — desktop search redesigned to match mobile pill: `border: 1px solid var(--border)`, `border-radius: 8px`, `background: var(--ink-10)`, `padding: 7px 34px 7px 12px`. SVG search icon added inside `.search-wrap`, positioned absolute at `right: 36px`.
- `src/routes/(admin)/dashboard/posts/new/+page.server.ts` — added `calcReadingTime(contentJson)` helper (parse JSON → word count / 200, min 1). `readingTime: null` replaced with `readingTime: calcReadingTime(content)`.
- `src/routes/(admin)/dashboard/posts/[id]/edit/+page.server.ts` — same `calcReadingTime` helper. `readingTime: calcReadingTime(content)` added to `updatePost` call (was previously absent from this action).
- `src/routes/(public)/posts/[slug]/+page.svelte` — `BookmarkButton` added to `.post-byline` (top of article, after `AuthorByline`) in a `.byline-bookmark { margin-left: auto }` wrapper. Bottom placement in `.share-section` was already present.
- `src/lib/components/blog/CategoryPill.svelte` — default href corrected: `/?category={slug}` → `/categories/{slug}`.
- `src/routes/(public)/+page.svelte` — category dive `SectionHead href` corrected: `/?category={slug}` → `/categories/{slug}`.
- `.prettierignore` — added `worker-configuration.d.ts` (auto-generated by `wrangler types`; not formattable; was failing `pnpm lint` on every run).

**Decisions:**

- List-style rules added as separate rules (not combined selector) — type override must follow the preflight reset at equal or higher specificity.
- Pull quote `insertContent` with `attrs: { class: 'pull-quote' }` — Tiptap's default Blockquote extension does not persist HTML attrs; class may not survive document round-trips until extension is configured. Known limitation, deferred.
- `calcReadingTime` local to each server file — single-use, no shared utility warranted.

**Verification:**

- `pnpm typecheck` → 0 errors (10 pre-existing warnings, unchanged)
- `pnpm lint` → 0 errors (2 pre-existing warnings in `worker-configuration.d.ts`)
- Deploy green ✓ (1m4s, all steps passed)

---

## Session 15 — Design Polish & Bug Fixes

**Date:** 2026-05-27
**Scope:** 13 targeted fixes across design consistency, accessibility, data wiring, and UX — no new features, no schema changes.

**Built / Fixed:**

- `src/app.css` — dark mode warm palette: `--cream` `#111318` → `#16120d`, `--border` `#2a2d35` → `#2c2318`, `--img-stripe-a/b` de-blued to warm browns. Light theme `--ink-30` / `--color-ink-muted` / `--color-ink-subtle` lifted `#b0a599` → `#8a7d72` for WCAG AA contrast. Pull quote block added to `.prose` styles: 48px saffron rule, italic serif `clamp(1.25–1.625rem)`, ink-60 colour.
- `src/routes/(public)/posts/[slug]/+page.svelte` — `outline: none` removed from `.comment-textarea`; `:focus` now sets `outline: 2px solid var(--accent); outline-offset: 2px`. Comment monogram `[0]` index removed — shows two initials (e.g. "RS" not "R"); font-size reduced `14px` → `11px` to fit. `AuthorCard` full variant now passes `bio: post.author.bio ?? null` and `role: post.author.role ?? null` instead of hardcoded `null`. End-of-article saffron ornament added (`<div class="article-end"><span class="end-dot">·</span></div>`) before `</footer>`. Cover image `@keyframes develop` (greyscale → colour in 0.8s) wrapped in `@media (prefers-reduced-motion: no-preference)`.
- `src/lib/server/queries/posts.ts` — `listSelect` extended with `authorBio: authors.bio` and `authorRole: authors.role`; `ListRow` type updated; `toListItem` passes them through to `PostAuthor`.
- `src/lib/server/queries/search.ts` — same `authorBio`/`authorRole` additions mirrored (fixes TS error from `PostAuthor` type update).
- `src/lib/types/index.ts` — `PostAuthor` interface extended with `bio: string | null` and `role: string | null`.
- `src/lib/components/blog/Navbar.svelte` — `.search-input:focus` focus outline added (`outline: none` retained on base rule, explicit `:focus` rule adds accent outline). Dropdown and mobile menu reordered: "My Profile" shown first for all roles; "Dashboard" shown below for admin/author only. Previously admin/author saw only "Dashboard" with no profile access.
- `src/lib/components/blog/NewsletterForm.svelte` — `.nl-input:focus` adds `outline: 2px solid var(--accent); outline-offset: 2px`.
- `src/lib/components/blog/CarouselHero.svelte` — `.dot` touch target expanded to 44px via `padding: 20px 10px; margin: -20px -10px; box-sizing: content-box`; visual 5px dot unchanged.
- `src/lib/components/blog/Footer.svelte` — `<a href="/admin">Editorial Desk</a>` removed from Pages column (was visible to all public visitors).
- `src/lib/components/blog/SmallCard.svelte` — `.image` and `.img-placeholder` fixed `height: 175px` replaced with `aspect-ratio: 16 / 9`. Hover state changed from `opacity: 0.78` to `transform: scale(1.03)` on image — directional activation rather than disabling dim.

**Decisions:**

- `authorBio`/`authorRole` added to the shared `listSelect` in both `posts.ts` and `search.ts` — keeps the query shape consistent; cost is two extra text columns per row (negligible).
- `PostAuthor` type extended rather than creating a separate `PostDetailAuthor` — all consumers that receive an author already go through the same query path; no need for two types.
- Develop animation scoped to `prefers-reduced-motion: no-preference` — keeps motion opt-in per OS accessibility setting.
- Pull quote CSS lives in `app.css` `.prose` block — ready to be used as a Tiptap custom node HTML class; no editor wiring needed yet.

**Verification:**

- `pnpm typecheck` → 0 errors (7 pre-existing warnings, unchanged)
- Deploy green ✓ (1m24s, all steps passed)

---

## Session 14 — UI Fixes & Design Implementation

**Date:** 2026-05-21
**Scope:** UI polish pass — post page content rendering, cover image layout, link styles, editor UX, category colors, integrations fix, and design handoff implementation for newsletter block and discussion section.

**Built / Fixed:**

- `src/lib/utils/tiptap-to-html.ts` — **new**: pure TypeScript recursive Tiptap JSON → HTML serializer, zero imports, zero DOM dependency. Handles all node types (paragraph, heading, blockquote, bulletList, orderedList, listItem, hardBreak, hr, codeBlock, image) and marks (bold, italic, strike, code, link). Replaces `generateHTML` from `@tiptap/core` which silently fails in CF Workers edge runtime (the `catch` returned `''` → blank post bodies). Permanent fix — version-independent.
- `src/lib/components/blog/PostContent.svelte` — switched from `generateHTML` (Tiptap runtime, fragile) to `tiptapToHtml` (inline serializer). Also added `Link` extension earlier in session (since removed — serializer makes it irrelevant).
- `src/routes/(public)/posts/[slug]/+page.svelte` — cover image moved outside narrow 680px article column into its own element; desktop max-width 1100px, mobile 100vw full bleed (no padding, no border-radius); post body top spacing handled by `post-page--body` wrapper. Also: NL block moved before discussion section per design spec.
- `src/app.css` — synced `--accent` token to `#df8024` in both light and dark themes (was still `#e8872a` after Tailwind `--color-accent` was updated); prose link style reworked to Morning Brew pattern: `color: inherit`, `text-decoration-color: var(--accent)`, `text-decoration-thickness: 2px`, `text-underline-offset: 4px`, hover adds ease-in-out background; `--color-accent` + `--color-accent-hover` darkened (`#e8872a` → `#df8024`, hover `#d07820` → `#c87018`).
- `src/lib/components/blog/CategoryPill.svelte` — uses `category.color` (already in DB schema and all queries) to set pill text/background per category via CSS custom properties; falls back to accent vars when color is null.
- `src/lib/components/admin/TiptapEditor.svelte` — added `BubbleMenu` extension (`@tiptap/extension-bubble-menu` installed, all Tiptap packages synced to 3.23.5); floating toolbar appears on text selection with B/I/S, H2/H3, link, blockquote buttons; dark theme matching admin palette.
- `src/routes/(public)/+layout.server.ts` — Umami bug fixed: `umamiWebsiteId` now reads from `settings.umami_website_id` (DB) first, falls back to `env.UMAMI_WEBSITE_ID`; previously only read the env var, making the dashboard integration settings non-functional.
- `src/lib/server/queries/users.ts` — added `isNewsletterSubscriber` to `getAllUsers()` select.
- `src/routes/(admin)/dashboard/users/+page.svelte` — small green "NL" badge on newsletter-subscribed users.
- `src/lib/components/blog/NewsletterForm.svelte` — **full redesign** per design handoff: 2px ink top border / 1px border bottom, centered layout; mono accent label → serif italic heading `clamp(1.6–2.25rem)` → ui description; input+button joined edge-to-edge (no gap, 2px radius); success state with "Subscribed ✓" label + serif italic heading + ui subtext; error shows accent fine print; mobile stacks vertically.
- `src/routes/(public)/posts/[slug]/+page.svelte` comments block — **full redesign** per design handoff: `SectionHead "Discussion · {count}"`; form-first layout (above list); 3200ms accent flash "Comment posted ✓"; textarea redesigned (14px ui, 2px radius, cream bg, focus → ink border); submit: ink bg/cream text, 12px uppercase, right-aligned; comment list border-top container / border-bottom per item; monogram avatar 36×36 (ink-10 bg, serif 14px ink-60); name ui 600 13.5px / date mono 10px ink-30 / body serif 15px 1.72lh; empty state serif italic ink-30.

**Decisions:**

- `generateHTML` (Tiptap) abandoned permanently — not reliable in CF Workers edge runtime across version upgrades. Custom serializer covers 100% of editor output and is runtime-agnostic.
- Cover image width: 1100px on desktop (user chose from options: 1100 / 1280 / 100vw). Mobile: always 100vw full bleed.
- Accent darkened from `#e8872a` to `#df8024` (user confirmed `#df8024` from three-option picker).
- BubbleMenu added to editor — Tiptap packages synced to 3.23.5 to satisfy peer deps; this triggered the `generateHTML` breakage above.
- Design handoff (newsletter + discussion) implemented from `design_handoff_newsletter_comments` bundle extracted from gzipped tar; README and JSX reference used verbatim for specs.

**Verification:**

- `pnpm typecheck` → 0 errors (7 pre-existing warnings) on each commit
- All deploys green ✓

**Deferred:**

- Typography extension no longer in PostContent (serializer handles it implicitly) — smart quote / em-dash substitution now only happens in the editor, not the rendered output. Could add to serializer if needed.

---

## Session 13c — Newsletter Fixes & Admin UX

**Date:** 2026-05-21
**Scope:** Post-deploy fixes to newsletter infrastructure — Resend sender env vars, rate limit, admin users table badge.

**Built / Fixed:**

- `.dev.vars.example` + `.env.example` — added `RESEND_FROM_EMAIL` and `RESEND_FROM_NAME` slots (default `onboarding@resend.dev` / `Open Tabs` for dev)
- `src/routes/register/+page.server.ts` — replaced hardcoded `noreply@indexdaily.in` with `RESEND_FROM_EMAIL` env var (fallback `onboarding@resend.dev`); added `RESEND_FROM_NAME`-aware `from` construction; wrapped username uniqueness DB query in try/catch to return graceful 500 on Neon cold start instead of unhandled error
- `src/routes/api/newsletter/subscribe/+server.ts` — replaced hardcoded sender with IIFE using `RESEND_FROM_EMAIL` / `RESEND_FROM_NAME` env vars; replaced hardcoded domain in welcome email text with `PUBLIC_SITE_URL` env var
- `src/routes/(admin)/dashboard/settings/+page.server.ts` — added `env` import; test email sender now uses form field override → `RESEND_FROM_EMAIL` env var → `onboarding@resend.dev` fallback, with `RESEND_FROM_NAME` support
- `src/lib/server/resend.ts` — fixed Resend 429 rate limit: `syncUserToResend` was making `contacts.create` + separate `contacts.segments.add` (2 calls, hits 2 req/s limit). Merged both segments into single `contacts.create` payload — one API call total.
- `src/lib/server/queries/users.ts` — added `isNewsletterSubscriber` field to `getAllUsers()` select
- `src/routes/(admin)/dashboard/users/+page.svelte` — newsletter subscriber flag: small green "NL" badge next to user name for subscribed users

**Root causes fixed:**

- Resend 403 "Domain not verified" — hardcoded `noreply@indexdaily.in` in 3 places; domain not verified in Resend. Fixed via env vars with `onboarding@resend.dev` fallback.
- Resend 429 on contact sync — double API call (create + segments.add) in same request; merged into single create call.
- Register 500 on Neon cold start — bare `const [x] = await db.select()` with no error handling; wrapped in try/catch.

**Verification:**

- `pnpm typecheck` → 0 errors (7 pre-existing warnings)
- Deploy green ✓

---

## Session 13b — Newsletter Infrastructure

**Date:** 2026-05-21
**Scope:** Full newsletter infrastructure — schema, Resend service, subscribe flow, webhook, email template, admin dashboard. No broadcast sending UI yet.

**Built:**

- `src/lib/server/db/auth.schema.ts` — added 4 columns to `user` table: `isNewsletterSubscriber` (boolean, default false), `newsletterSubscribedAt` (timestamp, nullable), `newsletterSource` (text, nullable, typed as `'registration' | 'subscribe_form' | 'manual' | null`), `resendContactId` (text, nullable)
- `drizzle/migrations/0011_newsletter_user_fields.sql` — `ALTER TABLE "user" ADD COLUMN` for all 4 fields
- `drizzle/migrations/meta/_journal.json` — journal entry for 0011 added
- `.env.example` + `.dev.vars.example` — added `RESEND_SEGMENT_ALL_USERS_ID`, `RESEND_SEGMENT_NEWSLETTER_ID`, `RESEND_TOPIC_NEWSLETTER_ID`, `RESEND_WEBHOOK_SECRET`
- `src/lib/types/index.ts` — added `ask_newsletter_on_register` to `SiteSettings`
- `src/app.d.ts` — added `isNewsletterSubscriber: boolean` and `resendContactId: string | null` to `Locals.user`
- `src/hooks.server.ts` — DB select extended to include new fields; `event.locals.user` assignment extended; `/dashboard/newsletter` added to `ADMIN_ONLY_ROUTES`
- `src/lib/server/resend.ts` — new: `syncUserToResend(user)` (creates global contact with all-users segment + optional newsletter segment/topic, returns contactId); `updateNewsletterSubscription(contactId, subscribe)` (adds/removes newsletter segment + updates topic opt_in/opt_out); `updateResendContact(contactId, fields)` (syncs name changes). All wrapped in try/catch, never throw. Uses Resend SDK v6.12.3 new Contacts API (no audienceId).
- `src/lib/server/queries/newsletter.ts` — new: `getNewsletterStats()` (total, newThisMonth, bySource); `getRecentSubscribers(limit)` (20 most recent sorted by subscribedAt desc)
- `src/routes/register/+page.server.ts` — load now fetches `askNewsletterOnRegister` setting; register action reads `newsletterOptIn` checkbox; updates user with newsletter fields; fire-and-forgets `syncUserToResend` and saves contactId back to DB
- `src/routes/register/+page.svelte` — newsletter opt-in checkbox (pre-checked) shown when `askNewsletterOnRegister` is true
- `src/routes/api/newsletter/subscribe/+server.ts` — new `POST` handler: email validation; existing user + already subscribed → `{status: 'already_subscribed'}`; existing user not subscribed → update + Resend sync + welcome email; new user → minimal account via Better Auth + Resend sync + welcome email
- `src/lib/components/blog/NewsletterForm.svelte` — new: email input + Subscribe button, 3 states (idle/loading/success); uses `/api/newsletter/subscribe`
- `src/routes/(public)/posts/[slug]/+page.svelte` — `<NewsletterForm />` added above related posts
- `src/routes/(public)/+page.svelte` — `<NewsletterForm />` added below latest list
- `src/routes/unsubscribe/+page.svelte` — new: minimal standalone page, no navbar, "You've been unsubscribed." message
- `src/routes/api/webhooks/resend/+server.ts` — new `POST` handler: verifies Resend webhook signature via `resend.webhooks.verify()`; handles `contact.updated` (unsubscribed=true → set isNewsletterSubscriber=false), `email.complained` (same), `email.bounced` (log to Tinybird); always returns 200
- `package.json` — added `@react-email/components` dependency; added `email:preview` script
- `src/lib/email/newsletter-welcome.tsx` — new: React Email template with Open Tabs masthead, welcome message, what-to-expect bullets, footer with unsubscribe link
- `src/routes/(public)/profile/+page.server.ts` — added `?/toggleNewsletter` action: flips `isNewsletterSubscriber`, updates timestamps/source, calls `updateNewsletterSubscription` or `syncUserToResend` as needed
- `src/routes/(public)/profile/+page.svelte` — newsletter card in user sidebar: shows subscribed/not-subscribed status + subscribe/unsubscribe toggle button
- `src/routes/(admin)/dashboard/newsletter/+page.server.ts` + `+page.svelte` — new admin page: stat cards (total, new this month, by source), Compose Newsletter button (disabled, "Coming soon" tooltip), `askNewsletterOnRegister` toggle, recent subscribers table
- `src/routes/(admin)/+layout.svelte` — Newsletter nav item added (mail icon, adminOnly)

**Decisions:**

- Resend SDK v6 new Contacts API used (no audienceId) — segments + topics on `contacts.create()`; `contacts.segments.add/remove` + `contacts.topics.update` for subscription changes
- `syncUserToResend` fire-and-forget from register and subscribe API — Resend sync must never block user-facing response; `resendContactId` saved back asynchronously
- Subscribe API: existing subscribed users get `{status: 'already_subscribed'}` response (same UX as success) — no leaking of account existence
- New subscribers via subscribe form created with random password — Better Auth account allows future login/password-reset; `role: 'reader'`
- `contact.updated` used for unsubscribe webhook (SDK has no `contact.unsubscribed` event) — `data.unsubscribed === true` check
- Webhook returns 200 always — Resend requires non-2xx to trigger retry; we never want retries for events we've processed (or intentionally ignored)
- `email:preview` script uses `email dev` CLI from `@react-email/components` — user must run locally to preview

**Verification:**

- `pnpm typecheck` → 0 errors (7 pre-existing warnings, unchanged)
- `pnpm lint` → 0 errors (2 pre-existing warnings in `worker-configuration.d.ts`)
- `pnpm build` → clean

**Deferred:**

- Newsletter broadcast sending UI (compose, schedule, send) — explicitly out of scope for this session
- Manual Resend dashboard setup (segments, topics, webhook) — must be done by user before newsletter fields work in prod

---

## Session 13 — ID Standardisation

**Date:** 2026-05-21
**Scope:** Standardise all application-owned entity IDs to Stripe-style `{prefix}_{32 base62 chars}`. No feature changes, no UI changes.

**Built:**

- `src/lib/server/db/generate-id.ts` — new: `customAlphabet` from nanoid with base62 alphabet (`0-9A-Za-z`), length 32; exports `generateId(prefix: IdPrefix): string` and `generateRandom` (bare 32-char generator for non-entity uses); `IdPrefix` type covers `pst | cat | tag | aut | cmt | rh | sub | log`
- `src/lib/server/queries/posts.ts` — `nanoid()` → `generateId('pst')`
- `src/lib/server/queries/categories.ts` — `` `cat_${nanoid(8)}` `` → `generateId('cat')`
- `src/lib/server/queries/tags.ts` — `nanoid()` → `generateId('tag')`
- `src/lib/server/queries/authors.ts` — `` `aut_${nanoid(12)}` `` → `generateId('aut')`
- `src/lib/server/queries/comments.ts` — `nanoid()` → `generateId('cmt')`
- `src/lib/server/queries/read-history.ts` — `nanoid()` → `generateId('rh')`
- `src/lib/server/logger.ts` — `` `log_${nanoid(12)}` `` → `generateId('log')`
- `src/routes/api/track/+server.ts` — `` `evt_${nanoid(12)}` `` → `` `evt_${generateRandom()}` ``
- `src/routes/api/upload/+server.ts` — `nanoid()` (R2 file key) → `generateRandom()`
- `src/routes/(admin)/dashboard/posts/new/+page.server.ts` — `nanoid(6)` (slug dedup suffix) → `generateRandom().slice(0, 6)`
- `src/lib/server/db/seed.ts` — full rewrite: removed hardcoded IDs from all data arrays; IDs generated via `generateId()` at insert time; all `onConflictDoUpdate` targets changed from `.id` (PK) to `.slug` (unique); cross-references use `.returning({ id })` to fetch actual row IDs; `AUTHOR_ID` derived from DB after insert, category/tag IDs stored in Maps keyed by slug
- `CLAUDE.md` — Rule 11 added: `generateId()` is the only permitted way to generate application entity IDs; prefix table documented; Better Auth tables explicitly exempt

**Decisions:**

- Existing DB records left as-is — mixed old/new format is fine; DB enforces uniqueness, not format. No migration needed.
- `generateRandom` exported for non-entity uses (R2 file keys, Tinybird event IDs, slug dedup) so zero `nanoid` imports exist outside `generate-id.ts`
- Seed uses slug as conflict target across all tables — all slug columns have `.unique()` DB constraint; idempotent across runs regardless of generated ID
- Better Auth tables (`user`, `session`, `account`, `verification`) exempt — owned by library, not touched

**Verification:**

- `pnpm typecheck` → 0 errors (6 pre-existing warnings, unchanged)
- `pnpm lint` → clean (0 errors; 2 pre-existing `worker-configuration.d.ts` warnings, unchanged)
- `pnpm build` → clean
- `grep -r "nanoid(" src/` → zero results

---

## Session 12 — Bug Fixes: Registration, RBAC, Dashboard UX

**Date:** 2026-05-21
**Scope:** Fix production registration failures, add RBAC user management, real-time email check, clear test data, fix admin author permissions, fix post editor bugs, dashboard light theme

**Built / Fixed:**

- `src/lib/server/auth/index.ts` — replaced `bcryptjs` with PBKDF2-SHA256 via Web Crypto API (`crypto.subtle.deriveBits`). bcrypt (pure-JS) exceeds Cloudflare Workers 10ms CPU limit on free tier; PBKDF2 is hardware-accelerated and CF-safe.
- `src/lib/server/db/auth.schema.ts` — added `pgEnum('user_role', ['reader', 'author', 'admin'])`, changed `user.role` from `text` to `userRoleEnum`
- `drizzle/migrations/0008_user_role_enum.sql` — `CREATE TYPE user_role AS ENUM`, `ALTER COLUMN role TYPE` (applied directly via Neon CLI + Node pg due to pooler issues)
- `drizzle/migrations/0009_clear_test_data.sql`, `0010_clear_data.sql` — `TRUNCATE` all tables to wipe test users and posts
- `src/lib/server/queries/users.ts` — new: `getAllUsers()`, `updateUserRole(userId, role)`
- `src/lib/server/queries/authors.ts` — added `getAuthorByUserId(userId)` helper
- `src/routes/(admin)/dashboard/users/+page.server.ts` — new: load all users; `updateRole` action (admin-only, blocks self-demotion, validates role enum); auto-creates author profile in `authors` table when promoting user to `author` or `admin`
- `src/routes/(admin)/dashboard/users/+page.svelte` — new: user table with role badges and dropdown to change role
- `src/hooks.server.ts` — added `/dashboard/users` to `ADMIN_ONLY_ROUTES`
- `src/routes/(admin)/+layout.svelte` — added "Users" nav item (adminOnly); replaced all `var(--font-display)` with `var(--font-sans)` throughout admin layout
- `src/routes/register/+page.svelte` — real-time email availability check (matching username check pattern): 400ms debounce, spinner/✕ icon, "Sign in?" link on taken state; submit blocked while checking or taken
- `src/routes/api/check-email/+server.ts` — new: GET handler, rate-limited (30 req/IP/min), queries user table by email, returns `{ available: boolean }`
- `src/app.css` — switched `--color-admin-*` from dark palette (`#15181e` bg) to light palette (`#f4f2ee` bg, `#ffffff` sidebar)
- `src/lib/components/admin/StatCard.svelte`, `TiptapEditor.svelte` — replaced `var(--font-display)` with `var(--font-sans)`
- `src/routes/(admin)/dashboard/analytics/+page.svelte`, `dashboard/+page.svelte`, `posts/new/+page.svelte`, `posts/[id]/edit/+page.svelte` — same font replacement
- `src/lib/server/queries/posts.ts` — added `getAllCategoriesAdmin()` using `LEFT JOIN` (so categories with zero published posts appear in admin post editor). Previous `getCategories()` used `INNER JOIN`, hiding new empty categories.
- `src/routes/(admin)/dashboard/posts/new/+page.server.ts` — changed to `getAllCategoriesAdmin()`; added `locals` to load, auto-creates author profile for admin/author users who don't have one (covers users who manually set their role in DB)
- `src/routes/(admin)/dashboard/posts/[id]/edit/+page.server.ts` — changed to `getAllCategoriesAdmin()`
- `wrangler.jsonc` — added `TINYBIRD_DATASOURCE: "open_tabs_events"` to vars block

**Root causes fixed:**

- **Registration "failed" in prod** — `BETTER_AUTH_SECRET` not set in CF Pages env; once set, `auth.api.signUpEmail` worked
- **CPU time exceeded on /register POST** — bcrypt too slow for CF Workers free tier; fixed with PBKDF2
- **DB migrations not applying via GH Actions** — Neon pooler (PgBouncer transaction mode) silently ignores DDL; fixed by switching GH secret `DATABASE_URL` to direct URL and running outstanding migrations manually via `neonctl connection-string` + Node pg
- **Categories not appearing in post editor** — `getCategories()` INNER JOIN excluded categories with zero published posts
- **Drafts "showing saved" but not persisting** — `authorId` was empty string (no author profiles existed); save returned `fail(400, { error: 'Author is required' })`; fixed by auto-creating author profile on first dashboard visit
- **Admin can't write posts** — same root cause: no entry in `authors` table; fixed via auto-create on role promotion or new-post page load

**Decisions:**

- PBKDF2-SHA256 at 100k iterations — CF-safe (Web Crypto hardware), comparable security to bcrypt-12 for this workload; hash format `pbkdf2:saltHex:hashHex` for future-proofing
- Auto-create author profile on `updateRole` action AND on new-post load — belt-and-suspenders; covers UI role promotion and direct DB role edits
- `getAllCategoriesAdmin()` as separate function from `getCategories()` — `getCategories()` stays INNER JOIN for public nav (only show categories with content); admin needs all categories
- Manually managed migrations for pooler-affected DDL — drizzle-kit exits 0 even when DDL silently fails through pooler; direct URL in CI now prevents recurrence
- Dashboard light theme — client preference; `--color-admin-*` vars keep the orange accent (`#e8872a`); warm grays match public-site cream palette

**Deferred:**

- Email verification flow (Resend welcome email sends, but no verify-email gate)
- Tinybird CLI setup for analytics pipes (user must run `tb push` manually)

---

## Session 11b — Comments + Admin Moderation

**Date:** 2026-05-20
**Scope:** Flat comment system — reader submission on post pages, admin moderation, profile comments tab

**Built:**

- `src/lib/server/db/schema.ts` — added `CommentStatus` type + `comments` table: `id`, `postSlug`, `userId` (FK→user, cascade), `body`, `status` (pending|approved|rejected, default pending), `createdAt`, `updatedAt`
- `drizzle/migrations/0007_comments.sql` — manual migration: CREATE TABLE + FK constraint
- `drizzle/migrations/meta/_journal.json` — entry for 0007_comments
- `drizzle/migrations/meta/0007_snapshot.json` — full schema snapshot with comments table
- `src/lib/types/index.ts` — added `Comment`, `NewComment`, `CommentWithUser`, `CommentAdminView`, `UserComment` types; re-exported `CommentStatus`
- `src/lib/server/queries/comments.ts` — `getApprovedComments(postSlug)`: approved comments ordered by oldest first; `addComment(userId, postSlug, body)`: insert pending; `getAllComments({ status?, search?, limit?, offset? })`: admin list with LEFT JOIN to posts for title; `approveComment/rejectComment/deleteComment(id)`; `getUserComments(userId)`: user's own comments with post title; `getPendingCommentCount()`: count pending for sidebar badge
- `src/routes/(public)/posts/[slug]/+page.server.ts` — load now fetches `getApprovedComments` in parallel; `?/addComment` action: auth check, 10–1000 char validation, insert; returns `{ commentSuccess: true }` or `fail(400|401|500, { commentError })`
- `src/routes/(public)/posts/[slug]/+page.svelte` — comment section added below article footer: approved comment list (avatar, @username, date, body), form for logged-in users (textarea + char count + submit), "Sign in to comment" CTA for guests; success banner clears after submit
- `src/routes/(admin)/dashboard/comments/+page.server.ts` — load: `getAllComments` with status/search/page filters; actions: `?/approve`, `?/reject`, `?/delete`
- `src/routes/(admin)/dashboard/comments/+page.svelte` — status tab filter bar + search input; comment cards with meta (author/post title/date), body excerpt, status badge, Approve/Reject/Delete action buttons
- `src/routes/(admin)/+layout.svelte` — Comments nav item added (adminOnly: true, chat icon); pending count badge shown when `pendingCommentCount > 0`
- `src/routes/(admin)/+layout.server.ts` — added `getPendingCommentCount()` in parallel with `getRecentErrorCount()`; returns `pendingCommentCount`
- `src/hooks.server.ts` — `/dashboard/comments` added to `ADMIN_ONLY_ROUTES`
- `src/routes/(public)/profile/+page.server.ts` — added `getUserComments` load in parallel with readHistory
- `src/routes/(public)/profile/+page.svelte` — Comments tab now enabled; shows user's own comments with status labels, post link, date; empty state if none

**Decisions:**

- No `parentId` / threading — flat list only; threading deferred until comment volume justifies it
- New comments default to `pending` — admin must approve before showing publicly; avoids spam on public pages
- `getApprovedComments` loaded in parallel with `getRelatedPosts` + `getSettings` on post page — adds zero latency to the critical path
- `addComment` action uses `fail(401)` for unauthenticated (defense-in-depth — hooks already redirects, but form action must also guard)
- Admin comments page is `adminOnly` — authors cannot moderate; simple enough for MVP with low volume
- Profile Comments tab shows all of a user's own comments regardless of status — lets them see moderation outcome
- `getPendingCommentCount` in admin layout server — small query, runs parallel, gives live badge without per-route instrumentation

**Deferred:**

- Email notification to admin on new comment (Resend + comment webhook)
- Comment count on post cards / post page header
- Author-level comment moderation (own posts only)

---

## Security Patch — IDOR on Post Edit/Delete (author role)

**Date:** 2026-05-20
**Scope:** Close Critical IDOR vulnerability discovered in security audit — authors could edit or delete any post by supplying an arbitrary post ID.

**Root cause:** The posts/[id]/edit load function, save action, and delete action performed no ownership verification. The posts list deletePost action had the same gap. Route protection only checked that the user was authenticated and non-reader, not that the post belonged to them.

**Ownership chain:** `posts.authorId` → `authors.id` → `authors.userId` → `user.id`. `locals.user.id` is the login identity. The check must traverse the authors JOIN to compare `authors.userId` against `locals.user.id`.

**Changes:**

- `src/lib/types/index.ts` — added `authorUserId: string | null` to `AdminPostDetail` interface
- `src/lib/server/queries/posts.ts` — `getAdminPostById` now LEFT JOINs `authors` and selects `authors.userId` as `authorUserId`; added `getPostOwnerUserId(postId)` lightweight helper for use in actions
- `src/routes/(admin)/dashboard/posts/[id]/edit/+page.server.ts` — load: added `locals`, `error(403)` when `role=author` and `post.authorUserId !== locals.user.id`; save action: same check before any mutation; delete action: same check before deletion
- `src/routes/(admin)/dashboard/posts/+page.server.ts` — deletePost action: `fail(403)` when author tries to delete a post they don't own

**Verification:** `pnpm typecheck` → 0 errors; `pnpm build` → clean; all changed files pass Prettier and ESLint.

---

## Session 11a — RBAC, Reader Auth & Reader Profile

**Date:** 2026-05-20
**Scope:** Role-based access control (reader/author/admin), extended user schema, registration with username, real-time username check, reader profile + edit pages, read history, navbar auth state, admin sidebar role restrictions, author post filter

**Built:**

- `src/lib/server/db/auth.schema.ts` — added 5 columns to Better Auth `user` table: `firstName`, `lastName`, `username` (unique), `role` (default `reader`), `avatarUrl`
- `src/lib/server/db/schema.ts` — added `readHistory` table: `id`, `userId` (FK→user, cascade), `postSlug`, `postTitle`, `coverImageUrl`, `readAt`; unique constraint on `(userId, postSlug)`
- `drizzle/migrations/0006_rbac_reader_profile.sql` — manual migration (no DATABASE_URL in dev): ALTER TABLE + CREATE TABLE + FK + unique constraint
- `drizzle/migrations/meta/_journal.json` + `0006_snapshot.json` — journal entry + full schema snapshot created manually
- `src/lib/types/index.ts` — added `UserRole` type alias, `ReadHistory` and `NewReadHistory` inferred types
- `src/app.d.ts` — extended `Locals.user` with `firstName`, `lastName`, `username`, `role`, `avatarUrl`, `emailVerified`, `createdAt`
- `src/lib/server/auth/index.ts` — added `user.additionalFields` config so Better Auth includes custom columns in session user object
- `src/hooks.server.ts` — complete rewrite: role-aware session hydration (DB fallback for old sessions lacking `role`), route protection (`/dashboard` → login or /profile for readers; admin-only routes for non-admin; `/profile` → login)
- `src/routes/login/+page.server.ts` — role-based redirect post sign-in: admin/author → `/dashboard`, reader → `/profile`; `?redirect=` param honored for `/profile/*` paths only
- `src/routes/register/+page.server.ts` — rewritten: firstName/lastName/email/username/password fields; per-field `FieldErrors` type at module scope; username regex + uniqueness check; Better Auth `signUpEmail` + `db.update` for extra fields; Resend welcome email (non-fatal); redirect to `/profile?welcome=1`
- `src/routes/register/+page.svelte` — full rewrite: name-row (first+last side-by-side, stacks <400px), realtime username check (400ms debounce, spinner/✓/✕ indicator), show/hide password, submit blocked if username not available
- `src/routes/api/check-username/+server.ts` — GET endpoint: regex validation, in-memory rate limit (30 req/IP/min), DB query, `{ available, reason? }` response, `Cache-Control: public, max-age=5`
- `src/lib/server/queries/read-history.ts` — `recordReadHistory(userId, post)`: upsert on `(userId, postSlug)` unique conflict, updates `readAt`; `getReadHistory(userId, limit)`: returns 20 most recent reads
- `src/routes/(public)/posts/[slug]/+page.server.ts` — added fire-and-forget `recordReadHistory` via `void` when user is logged in
- `src/routes/(public)/profile/+page.server.ts` — load: user from `locals.user`, last 20 read history entries
- `src/routes/(public)/profile/+page.svelte` — two-column layout: user card (avatar with initials fallback, @username, member since, edit/sign-out) + activity panel (reading history tab, comments tab disabled)
- `src/routes/(public)/profile/edit/+page.server.ts` — `?/updateProfile`: validates + checks username uniqueness (excluding self); `?/updateAvatar`: updates avatarUrl
- `src/routes/(public)/profile/edit/+page.svelte` — avatar upload (file input → uploadImage → auto-submit ?/updateAvatar), username realtime check (skips if unchanged), email field disabled
- `src/routes/(public)/+layout.server.ts` — passes `user` (id/name/firstName/lastName/avatarUrl/role) to layout
- `src/routes/(public)/+layout.svelte` — passes `user` prop to `<Navbar>`
- `src/lib/components/blog/Navbar.svelte` — added `NavUser` prop, auth state UI: Sign In link (logged out) or avatar button → dropdown (My Profile / Dashboard / Sign Out); closes on Escape/backdrop click
- `src/routes/(admin)/+layout.svelte` — `adminOnly` flag on nav items; `visibleNavItems` derived from `userRole`; authors see only Dashboard/Analytics/Posts; role label in sidebar footer
- `src/routes/(admin)/dashboard/posts/+page.server.ts` — `authorId` filter: authors see only their own posts
- `src/lib/server/queries/posts.ts` — `getAdminPosts` accepts optional `authorId` param; filters via `eq(authors.userId, params.authorId)` in existing JOIN
- `src/lib/server/db/seed.ts` — after creating admin user: `db.update` sets `role='admin'`, `firstName`, `lastName`, `username`

**Decisions:**

- Better Auth `user.additionalFields` — makes custom columns available in session user object without extra DB query on every request; old sessions pre-migration fall back to a DB query in hooks.server.ts
- `FieldErrors` at module scope in `register/+page.server.ts` — all `fail()` returns cast to same type so SvelteKit infers `ActionData` as `{ errors: FieldErrors } | null` rather than a discriminated union that breaks template type narrowing
- Author filter uses `eq(authors.userId, params.authorId)` not `eq(posts.authorId, ...)` — `posts.authorId` references the `authors` table PK (not user.id directly); filtering through the existing JOIN is correct
- Manual migration 0006 — same pattern as 0005 in Session 10; `pnpm db:generate` requires DATABASE_URL which is unavailable in dev
- In-memory rate limiting for `/api/check-username` — no Redis/KV available in this stack; Map-based 30 req/IP/min is sufficient for MVP; resets per worker instance (acceptable)
- Fire-and-forget via `void recordReadHistory(...)` — read history must never delay the article response; errors caught and silently dropped inside `recordReadHistory`

**Deferred:**

- Comments tab on profile page — grayed out, no `comments` table yet; will add when volume justifies it
- Email verification flow — Better Auth has the hook; Resend welcome email sends on registration but no verify-email gate yet

---

## Session 10 — Tinybird Analytics Migration

**Date:** 2026-05-20
**Scope:** Migrate all logging/analytics from NeonDB `logs` table to Tinybird — unified event stream, 15 pipe definitions, rewritten logger + queries, pageview tracking, `/dashboard/analytics` page

**Built:**

- `tinybird/datasources/open_tabs_events.datasource` — unified event stream schema: 14 columns, MergeTree engine, partitioned by month, sorted by `(timestamp, event, level)`, 90-day TTL
- `tinybird/pipes/` — 15 pipe definitions: `recent_logs`, `log_level_stats` (extra, not in spec — needed by log viewer StatCards), `kpi_summary`, `pageviews_by_day`, `top_pages`, `top_referrers`, `readers_by_country`, `readers_by_device`, `readers_by_platform`, `reading_time_distribution`, `content_gaps`, `error_rate_by_route`, `slow_routes`, `event_funnel`, `realtime_pulse`
- `src/lib/server/tinybird.ts` — `ingestEvent(row)` (POST to Events API with admin token) + `queryPipe<T>(pipeName, params)` (GET pipe JSON with read token); both use `env` object from `$env/dynamic/private`
- `src/lib/server/logger.ts` — rewritten to call `ingestEvent` directly; added `deriveDeviceType(ua)` helper; never throws (console.error on failure); `startTimer()` unchanged
- `src/lib/server/queries/logs.ts` — full rewrite: `getLogs({ level?, event?, search?, days? })` queries `recent_logs` pipe; `getLogStats()` queries `log_level_stats` pipe; `normalizeRow()` converts snake_case Tinybird fields + JSON-string meta to camelCase LogRow shape (component zero-change); removed `clearOldLogs()` (TTL handles expiry now)
- `src/lib/server/queries/analytics.ts` — added `getReaderAnalytics(days)`: queries 6 pipes in parallel (pageviews_by_day, top_pages, top_referrers, readers_by_country, readers_by_device, content_gaps); added `getRecentErrorCount()`: queries kpi_summary pipe; `getDashboardStats()` unchanged (still NeonDB)
- `src/lib/server/db/schema.ts` — removed `logs` pgTable definition and unused `index`/`json` imports
- `drizzle/migrations/0005_drop_logs.sql` — `DROP TABLE "logs"` + 3 index drops (created manually, no DATABASE_URL available for `pnpm db:generate`)
- `drizzle/migrations/meta/_journal.json` — entry added for 0005_drop_logs
- `drizzle/migrations/meta/0005_snapshot.json` — full schema snapshot minus logs table
- `src/hooks.server.ts` — added server-side pageview logging: bot filter regex, `isPublicPage` check (excludes `/api`, `/dashboard`, `/login`, static files), `waitUntil` for fire-and-forget; uses `event.platform?.ctx.waitUntil()` (field is `ctx`, not `context`)
- `src/routes/api/track/+server.ts` — client-side event endpoint; only accepts `reader.*` events; calls `ingestEvent` directly
- `src/lib/utils/track.ts` — `track(event, meta)`: fire-and-forget `fetch('/api/track', { keepalive: true })`
- `src/lib/server/queries/posts.ts` — added `getPostTitlesBySlugs(slugs): Promise<Map<string, string>>`; uses `inArray` from drizzle-orm
- `src/routes/(admin)/+layout.svelte` — Analytics nav item added between Dashboard and Posts (bar chart SVG icon)
- `src/routes/(admin)/dashboard/analytics/+page.server.ts` — loads `getReaderAnalytics(days)` + `getDashboardStats()`; resolves post titles for top pages via `getPostTitlesBySlugs`; reads `?days=` param (7/30/90, default 30)
- `src/routes/(admin)/dashboard/analytics/+page.svelte` — full analytics dashboard: KPI row (pageviews, unique paths, top country, top device); SVG bar chart (pageviews over time, ResizeObserver-based width); donut chart (device split, arc path math); country bars; platform bars; top pages table; content gaps table; 7/30/90 day switcher
- `src/routes/(admin)/dashboard/logs/+page.server.ts` — updated for new `getLogs` signature (`days` instead of `from`/`to`; no pagination; `totalPages: 1`)
- `wrangler.jsonc` — added 4 Tinybird vars (`TINYBIRD_BASE_URL`, `TINYBIRD_DATASOURCE`, `TINYBIRD_ADMIN_TOKEN`, `TINYBIRD_READ_TOKEN`) to `vars` block so wrangler-generated types include them
- `.dev.vars.example` — already had all 4 Tinybird slots (were present from session 9.5)

**Decisions:**

- Direct fetch over Tinybird SDK — no SDK exists for server-side SvelteKit; direct fetch is 3 lines and has zero additional dependencies
- `$env/dynamic/private` used as object (`env.VAR_NAME`), not destructured named import — matches the project-wide pattern established in session 9.5; named imports from this module throw at typecheck time in this project
- `log_level_stats` pipe added outside spec — the existing log viewer `+page.svelte` expects per-level 24h counts for StatCards; the `kpi_summary` pipe only returns `total_errors`; adding this pipe avoids rewriting the viewer component
- `normalizeRow()` in `logs.ts` — Tinybird returns snake_case (`duration_ms`, `error_stack`) and `meta` as JSON string; normalizer makes Tinybird transparent to the existing Svelte component
- `event.platform?.ctx.waitUntil()` — `app.d.ts` defines `Platform.ctx: ExecutionContext` (not `context`); confirmed by reading the type definition; using wrong field silently drops to no-op
- Manual migration creation — `pnpm db:generate` requires `DATABASE_URL` to connect to Neon; not available in dev environment; created `0005_drop_logs.sql` + snapshot JSON + journal entry manually; approach documented in case it recurs
- `keepalive: true` on `/api/track` fetch — ensures the request completes even if the browser navigates away before the response arrives (e.g., outbound link clicks)

**Deferred:**

- Tinybird CLI setup (user must do manually): `tb auth`, `tb push tinybird/datasources/`, `tb push tinybird/pipes/`, create read token in Tinybird UI
- Add 4 Tinybird env vars to Cloudflare Pages dashboard + GitHub Actions secrets
- `track()` call sites in public pages (e.g., article read-complete, share clicks) — utility is ready, not wired up yet

---

## Session 9 — Production Readiness

**Date:** 2026-05-20
**Scope:** Scheduled post publishing, image optimisation, performance hardening, error boundaries, SEO completeness, Cloudflare config, reading-time utility

**Built:**

- `src/lib/server/queries/posts.ts` — added `publishScheduledPosts()`: queries `status='scheduled' AND publishedAt <= now()`, bulk-updates to `published`; added `lte` to drizzle imports
- `src/routes/api/cron/publish/+server.ts` — GET endpoint; reads `CRON_SECRET` from `platform.env`; 401 on wrong token; calls `publishScheduledPosts()`; logs `cron.publish` / `cron.publish.failed`
- `src/app.d.ts` — extended `Platform.env` with `CRON_SECRET?: string` so the type compiles cleanly without adding a non-secret var to wrangler config
- `.dev.vars.example` — added `CRON_SECRET=` slot
- `.env.example` — added `CRON_SECRET=` slot with generation hint
- `wrangler.jsonc` — added `"nodejs_compat"` to compatibility_flags
- `_headers` (project root) — Cloudflare Pages security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) + cache rules for immutable assets, API no-store
- `_redirects` (project root) — `/blog/*` → `/posts/:splat` 301 redirect
- `src/lib/utils/image-url.ts` — `getOptimizedImageUrl(url, preset | opts)` + four convenience exports (`heroImage`, `cardImage`, `thumbnailImage`, `avatarImage`); uses Cloudflare Image Resizing via `/cdn-cgi/image/…`; pass-through for non-R2 URLs
- `src/lib/components/blog/PostCard.svelte` — hero/grid images use `heroImage`/`cardImage` optimised URLs; explicit `width`/`height` attrs; `fetchpriority="high"` on hero
- `src/lib/components/blog/SmallCard.svelte` — `thumbnailImage` optimised URL; explicit dimensions
- `src/lib/components/blog/TrendingCard.svelte` — `thumbnailImage` optimised URL; explicit dimensions
- `src/lib/components/blog/CarouselHero.svelte` — `heroImage` optimised URL; explicit dimensions
- `src/lib/components/blog/AuthorCard.svelte` — `avatarImage` optimised URL; explicit `width`/`height`; `loading="lazy"`
- `src/routes/(public)/posts/[slug]/+page.svelte` — cover image uses `heroImage`; explicit 1200×630 dims
- `src/app.css` — added `@media (prefers-reduced-motion: reduce)` block disabling all animations/transitions
- `src/routes/(public)/+page.server.ts` — wrapped DB calls in try/catch; category dives failure is non-fatal (returns `[]`)
- `src/routes/(public)/posts/[slug]/+page.server.ts` — wrapped `getPostBySlug` in try/catch; `getRelatedPosts` and `getSettings` use `.catch(() => fallback)` pattern
- `src/routes/(public)/+layout.svelte` — added `og:site_name`, `og:locale`, `og:image:width/height`, `twitter:card`, `twitter:site` meta tags
- `src/lib/server/db/recalculate-reading-times.ts` — standalone script; queries all posts, parses Tiptap JSON, recalculates `readingTime`, updates in DB; run with `npx tsx`

**Decisions:**

- `publishScheduledPosts()` uses `publishedAt` as the scheduled time (when `status='scheduled'`) — no extra column needed; consistent with how the editor already sets `publishedAt` for future posts
- Cron endpoint uses `platform.env.CRON_SECRET` (Cloudflare runtime env) rather than `$env/static/private` — avoids requiring the secret in wrangler-generated types; consistent with the R2 upload endpoint pattern
- `_headers`/`_redirects` placed in project root — adapter-cloudflare requires this; placing in `static/` triggers an adapter error
- Image optimisation only applies to `indexdaily.in` and `r2.cloudflarestorage.com` URLs — external images pass through unchanged
- `prefers-reduced-motion` applied globally via `* { transition-duration: 0.01ms }` — covers all component-level transitions without per-component changes
- `og:locale: en_IN` — publication is India-focused

**Deferred:**

- Actual Cloudflare cron scheduler invocation (requires a Cloudflare Worker or GitHub Actions `schedule` to call `/api/cron/publish` every 15 min with Bearer token)
- Lighthouse CI / Core Web Vitals measurement (requires live deployment)
- Full Tiptap bundle check (confirmed absent from client bundle by inspecting build output)

---

## Session 9.5 — Internal Structured Logging

**Date:** 2026-05-20
**Scope:** Full structured logging layer — NeonDB `logs` table, logger utility, instrumentation across all API routes / form actions / DB queries, admin log viewer at `/dashboard/logs`

**Built:**

- `drizzle/migrations/0004_tricky_korath.sql` — `logs` table with 13 columns + 3 indexes (`idx_logs_timestamp`, `idx_logs_event`, `idx_logs_level`)
- `src/lib/server/db/schema.ts` — added `logs` pgTable with json `meta`, text `error`/`errorStack`, indexes via Drizzle `index()` helper
- `src/lib/server/logger.ts` — `log(entry)` (never throws, fire-and-forget, console.log in dev), `logger.{info,warn,error}` convenience wrappers, `startTimer()` returning elapsed-ms fn
- `src/lib/server/instrument-action.ts` — `instrumentAction(name, route, userId, fn)` wraps form action fns; logs success/fail; re-throws SvelteKit redirects without logging
- `src/lib/server/queries/logs.ts` — `getLogs(filters)`, `getLogStats()`, `clearOldLogs()`, `getRecentErrorCount()`
- `src/routes/api/upload/+server.ts` — instrumented: `r2.upload.start`, `r2.upload.validation_failed`, `r2.upload.success`, `r2.upload.failed`
- `src/routes/login/+page.server.ts` — instrumented: `auth.login.success` (with email), `auth.login.failed` (no email/password logged)
- `src/hooks.server.ts` — instrumented: `auth.session_validation_failed` (only when cookie present + validation throws)
- `src/lib/server/queries/posts.ts` — `getPostBySlug`, `createPost`, `updatePost`, `upsertPostTags` wrapped with slow-query detection (500ms threshold) and error logging
- `src/lib/server/queries/analytics.ts` — `getDashboardStats` wrapped with slow-query detection
- `src/routes/(admin)/dashboard/posts/+page.server.ts` — `deletePost` instrumented
- `src/routes/(admin)/dashboard/posts/new/+page.server.ts` — `save` wrapped with `instrumentAction`
- `src/routes/(admin)/dashboard/posts/[id]/edit/+page.server.ts` — `save` + `delete` wrapped
- `src/routes/(admin)/dashboard/authors/+page.server.ts` — `create`, `update`, `delete` wrapped
- `src/routes/(admin)/dashboard/categories/+page.server.ts` — `create`, `update`, `delete` wrapped
- `src/routes/(admin)/dashboard/tags/+page.server.ts` — `update`, `delete` wrapped
- `src/routes/(admin)/dashboard/settings/+page.server.ts` — all 5 actions wrapped
- `src/routes/(admin)/+layout.server.ts` — added `getRecentErrorCount()` (catches errors → 0)
- `src/routes/(admin)/+layout.svelte` — Logs nav item added (terminal icon); red dot indicator when errors exist in last hour
- `src/routes/(admin)/dashboard/logs/+page.server.ts` — loads `getLogs` + `getLogStats` in parallel; reads all filter URL params
- `src/routes/(admin)/dashboard/logs/+page.svelte` — StatCards (error/warn/info 24h counts); filter toolbar (level, event prefix, search, date range); expandable log rows; auto-refresh toggle (10s interval via `invalidateAll`); pagination; copy JSON button

**Decisions:**

- Fire-and-forget logging: callers never `await log()` — logging must never block request handling or crash on DB failure
- `instrumentAction` checks `isRedirect(e)` before logging errors — SvelteKit redirects are normal flow, not failures
- `getRecentErrorCount()` wrapped in `.catch(() => 0)` in layout server — logging down must never break admin nav
- No cron job file exists yet — `clearOldLogs()` implemented as utility, to be called once `/api/cron/` is built (Session 10+)
- `meta::text ilike` used for JSON search — Drizzle `sql` template handles the cast; ILIKE on NULL returns false (correct behavior)
- Logs nav item uses terminal/chevron SVG icon; error dot positioned absolutely on icon with 7px red circle

**Deferred:**

- Calling `clearOldLogs()` from a cron job (no cron route exists yet)
- Reading time on posts (schema field exists, not computed)

---

## Session 8 — Admin Management Pages & Settings

**Date:** 2026-05-20
**Scope:** Authors/Categories/Tags CRUD admin pages + Settings page with 4 tabs + toast system + ConfirmModal + Resend test email

**Built:**

- `drizzle/migrations/0003_left_dragon_lord.sql` — schema changes: `authors.userId` nullable (was NOT NULL), added `authors.role` (text, default 'writer'), added `tags.updatedAt` (timestamp)
- `src/lib/server/db/schema.ts` — schema updated as above
- `src/lib/types/index.ts` — added `TagWithCount`, `AuthorWithEmail` interfaces; extended `SiteSettings` with `umami_website_id`, `umami_share_url`, `resend_api_key`, `resend_from_email`; updated `AdminPostDetail.tags` to include `updatedAt`
- `src/lib/server/queries/authors.ts` — added `getAuthorById` (left joins user for email), `createAuthor` (slug collision detection), `updateAuthor`, `deleteAuthor` (checks post count first), `getAllAuthorsWithPostCount`
- `src/lib/server/queries/categories.ts` — new file: `getCategoriesWithCount`, `getCategoryById`, `createCategory`, `updateCategory` (auto-generates slug from name if not overridden), `deleteCategory` (nulls category on posts before deleting)
- `src/lib/server/queries/tags.ts` — added `getAllTagsWithCounts`, `getTagById`, `updateTag` (regenerates slug), `deleteTag` (removes postTags first)
- `src/lib/server/queries/settings.ts` — added `updateSettings` (upserts multiple key-value pairs), `getSettingValue`
- `src/lib/stores/toast.ts` — toast store with `success()`, `error()`, `info()`, `dismiss()` — auto-removes after 4000ms
- `src/lib/components/admin/Toast.svelte` — fixed bottom-right toast stack; icon + message + progress bar + close button; green/red/neutral variants; slide-in animation; mobile: bottom-center
- `src/lib/components/admin/FormField.svelte` — label + slot + error + hint wrapper
- `src/lib/components/admin/TextInput.svelte` — dark-themed text/email/url/password input, bindable value
- `src/lib/components/admin/Textarea.svelte` — multiline input with optional character counter (turns red near limit)
- `src/lib/components/admin/SelectInput.svelte` — native select with custom arrow; bindable value
- `src/lib/components/admin/ColorPicker.svelte` — color swatch button → native color input; shows hex label
- `src/lib/components/admin/ConfirmModal.svelte` — overlay modal; Escape/Enter keyboard handling; danger mode (red confirm button); `role="dialog"` ARIA
- `src/routes/(admin)/dashboard/authors/+page.server.ts` — `?/create`, `?/update`, `?/delete` actions
- `src/routes/(admin)/dashboard/authors/+page.svelte` — authors table with avatar/initials; role pill badges; slide-over panel for create/edit; ConfirmModal for delete with post-count check
- `src/routes/(admin)/dashboard/categories/+page.server.ts` — `?/create`, `?/update`, `?/delete` actions
- `src/routes/(admin)/dashboard/categories/+page.svelte` — inline row editing (color swatch, name, slug); add-new inline row at top; ConfirmModal for delete
- `src/routes/(admin)/dashboard/tags/+page.server.ts` — `?/update`, `?/delete` actions (no create — tags come from post editor)
- `src/routes/(admin)/dashboard/tags/+page.svelte` — inline row editing (name only, slug auto-regenerates); client-side filter input; summary count; ConfirmModal for delete
- `src/routes/(admin)/dashboard/settings/+page.server.ts` — `?/saveGeneral`, `?/saveIntegrations`, `?/saveSeoDefaults`, `?/saveEmail`, `?/sendTestEmail` (Resend SDK, sends to logged-in user email)
- `src/routes/(admin)/dashboard/settings/+page.svelte` — 4-tab layout (General/Integrations/SEO/Email); URL hash persists active tab; pre-filled from DB; Resend key masked with last-4 hint; separate form for test email action
- `src/routes/(admin)/+layout.svelte` — added `<Toast />` mount (once, for all admin pages)
- `src/routes/(admin)/dashboard/posts/+page.svelte` — replaced `window.confirm` with `ConfirmModal` + hidden delete form pattern; added `toast.success/error` on delete
- `src/lib/components/admin/TagInput.svelte` — added `updatedAt` to temp tag object (schema change)
- `src/lib/server/queries/posts.ts` — `getAdminPostById` now selects `tags.updatedAt`

**Decisions:**

- `authors.userId` made nullable — admin can create author profiles without a linked user account (MVP: author = editorial profile, not necessarily a login account)
- Settings schema stays as key-value — `updateSettings` upserts multiple pairs via `Promise.all`; avoids a more complex single-row migration; `SiteSettings` type maps to known keys
- Delete pattern across all pages: hidden `<form>` with `use:enhance` + `bind:this` + `deleteFormEl.requestSubmit()` from ConfirmModal `onConfirm` — avoids fetch() and keeps SvelteKit form handling intact
- Inline row editing (Categories, Tags) vs slide-over panel (Authors) — categories/tags have short editable fields that fit a table row; authors have multiple fields plus avatar URL that warrant a full panel
- Settings tab state persisted in URL hash — `history.replaceState` on tab click; hash read on `onMount` — survives page refresh without polluting query params
- Resend test email uses API key from the form (not from env) — settings override env for flexibility; key is masked in the UI showing only last 4 chars
- `getAllCategories` uses raw SQL via `db.execute` to avoid a Drizzle LEFT JOIN ambiguity with the posts table (which has no direct `categoryId` filter needed for admin listing)
- `deleteCategory` nulls out `posts.categoryId` before deleting — no orphaned FK references, posts become "uncategorised"

**Deferred:**

- Media library (`/dashboard/media`) — still deferred
- Logo/favicon upload in General settings (CoverImageUploader variant) — deferred, OG image URL input used instead
- Author avatar upload from Settings (currently paste-URL only)

**Deploy fix (post-session):**

- `wrangler.jsonc` had `bucket_name: "opentabs-assets"` — bucket never existed; actual bucket is `open-tabs-media` (created session 7). Fixed and pushed as `fix(deploy): correct R2 bucket name to open-tabs-media`. All CI steps green. Live on CF Pages.

---

Session-by-session record of what was built, decisions made, and anything deferred.

---

## Session 7 — Post Editor (Tiptap, R2 Upload, New/Edit Routes)

**Date:** 2026-05-20
**Scope:** Full post creation and editing experience — Tiptap block editor, R2 image uploads, cover image upload, tag input, SEO panel, publish controls, auto-save

**Built:**

- `src/lib/utils/slugify.ts` — `slugify(text)`: lowercase, strip non-word, collapse spaces/underscores to hyphens, trim leading/trailing hyphens
- `src/lib/utils/upload-image.ts` — `uploadImage(file)`: client-side POST to `/api/upload`, returns public URL or throws on error
- `src/lib/server/queries/tags.ts` — `getAllTags()`: all tags sorted by name; `upsertTag(name)`: find-by-slug or insert with nanoid, returns `Tag`
- `src/lib/server/queries/authors.ts` — `getAllAuthors()`: all authors sorted by displayName
- `src/lib/server/queries/posts.ts` — added: `getAdminPostById(id)`: full post row + tags with `createdAt`; `createPost(data)`: insert with nanoid ID, returns postId; `updatePost(id, data)`: partial update with `updatedAt: new Date()`; `upsertPostTags(postId, tagIds)`: delete all then re-insert
- `src/lib/types/index.ts` — added `AdminPostDetail` interface (full post for editing including tags with createdAt)
- `src/routes/api/upload/+server.ts` — POST endpoint; auth-gated (`locals.user`); reads R2 creds from `$env/dynamic/private`; 5MB limit; allowed types: jpeg/png/webp/gif/avif; uploads via `@aws-sdk/client-s3` S3-compat API; returns `{ url }` with `PUBLIC_R2_PUBLIC_URL` base
- `src/lib/components/admin/TiptapEditor.svelte` — full editor: StarterKit, Image, Typography, Placeholder, CharacterCount, Link; sticky toolbar with H2/H3/Bold/Italic/Strike/Code/Link/IMG/Blockquote/BulletList/OrderedList/HR; active format state via `SvelteSet`; word count; image insert via file picker + paste-to-upload; paste handler uploads image files from clipboard; `onchange(json)` callback with `JSON.stringify(editor.getJSON())`
- `src/lib/components/admin/CoverImageUploader.svelte` — drag/drop/paste/click `<button>` dropzone; 3 states (empty/uploading/preview); 16:9 preview with remove button; `$bindable` value; 5MB + image-type validation
- `src/lib/components/admin/TagInput.svelte` — chip UI for selected tags; dropdown autocomplete from `allTags`; "Create new" option when no match; Backspace removes last chip; keyboard navigation (Enter/Backspace/Escape); accepts `inputId` prop for label association
- `src/lib/components/admin/SeoPanel.svelte` — excerpt textarea (char count); OG accordion (title + description + preview card); Twitter accordion (title + description + preview card); `$bindable` props for all fields; `line-clamp: 2` with vendor prefix
- `src/lib/components/admin/PublishControls.svelte` — status badge display; featured toggle (custom CSS toggle); Save draft / Publish / Update / Unpublish buttons; schedule datetime input (hidden unless Draft/Scheduled); all via `$bindable` props + event callbacks
- `src/lib/components/admin/PostEditorLayout.svelte` — 2-col grid (1fr / 320px fixed sidebar); sidebar sticky with scroll; collapses to single-col at <1024px
- `src/routes/(admin)/dashboard/posts/new/+page.server.ts` — `load`: parallel getCategories/getAllTags/getAllAuthors; `?/save` action: validates title + authorId, checks slug uniqueness, calls `createPost`, upserts tags (handles `new:` prefix for new tags), redirects to edit page
- `src/routes/(admin)/dashboard/posts/new/+page.svelte` — title/subtitle/slug fields (auto-slug from title, editable); TiptapEditor; sidebar with PublishControls / Meta (CoverImage + Details + Tags) / SEO tabs; Cmd+S submits; tags serialized as comma-joined names
- `src/routes/(admin)/dashboard/posts/[id]/edit/+page.server.ts` — `load`: getAdminPostById (404 if missing) + parallel meta; `?/save` action: validates, slug uniqueness check (excludes self), updatePost + upsertPostTags; `?/delete` action: db.delete + redirect
- `src/routes/(admin)/dashboard/posts/[id]/edit/+page.svelte` — init state from destructured data.post (avoids Svelte `state_referenced_locally` warning); auto-save 3s debounce + Cmd+S + Cmd+Enter (publish); Back link + Saved badge (from form?.success) + Delete button with confirm; same sidebar layout as new page
- `wrangler.jsonc` — added `PUBLIC_R2_PUBLIC_URL: ""`
- `.dev.vars.example` — added `R2_BUCKET=` and `PUBLIC_R2_PUBLIC_URL=` slots
- `package.json` — added `@aws-sdk/client-s3`, `@tiptap/extension-link`

**Decisions:**

- Content stored as Tiptap JSON (stringified), consistent with how `PostContent.svelte` reads it via `generateHTML`
- R2 uses S3-compat API (not wrangler binding) — credentials via `$env/dynamic/private` — binding still commented out until Session 8 decides if it's needed
- Tag "create new" uses `id: "new:name"` prefix convention; server strips the prefix and calls `upsertTag`
- `getAdminPostById` returns tags with `createdAt` to satisfy `Tag` type in TagInput component
- Auto-save on edit only (not new) — new post must be explicitly saved to get a stable ID for redirect
- `SvelteSet` from `svelte/reactivity` used for toolbar active-format state (ESLint rule `svelte/prefer-svelte-reactivity`)

**Deferred:**

- Cloudflare R2 binding in wrangler.jsonc (comment says Session 8)
- Reading time calculation (field exists in schema, not computed yet)
- Media library (`/dashboard/media`) — Session 8
- Author management pages — future session
- Tag/Category management pages — future session

---

## Session 6 (renamed) — Admin Shell, Dashboard Home & All Posts

**Date:** 2026-05-20
**Scope:** Full admin layout shell, dashboard home with real stats, All Posts management table with filters + delete action, public analytics injection

**Built:**

- `src/lib/server/db/schema.ts` — added `'scheduled'` to `PostStatus` union type (no migration needed — text column, type-only change)
- `src/lib/types/index.ts` — added `AdminPost` interface (admin-view post row with all status, author, category fields), `SiteSettings` extended with `gtm_id`, `ga4_id`, `meta_pixel_id` optional keys; re-exported `PostStatus`
- `src/lib/server/queries/analytics.ts` — new: `getDashboardStats()`: parallel `Promise.all` of 9 DB queries returning counts (total/published/draft/scheduled posts, categories, tags, authors) + `recentPosts` (5 by updatedAt desc) + `topPosts` (5 published by publishedAt desc with category join); typed `DashboardStats`, `RecentPost`, `TopPost` interfaces
- `src/lib/server/queries/posts.ts` — added `getAdminPosts({ status?, categorySlug?, search?, limit?, offset? })`: admin-view (all statuses), optional filters via `and(...conditions)`, `ilike` search across title+subtitle, left-joins author+category, orders by `updatedAt` desc, returns `{ posts: AdminPost[], total: number }`; added `ilike`, `or`, `SQL` imports from drizzle-orm
- `src/lib/stores/admin-page-title.ts` — new: `export const pageTitle = writable('Dashboard')` — shared writable store for admin top-bar title; each page sets on mount
- `src/app.css` — added status badge CSS vars to `:root`: `--color-status-{draft,published,scheduled,archived}` and corresponding `-bg` variants; removed pre-existing empty `.prose-drop-cap` ruleset (lint fix)
- `src/lib/components/admin/StatCard.svelte` — dark card; `label`, `value`, `sublabel?`, `accent?` props; large tabular-nums value; `accent=true` adds 3px left border in admin accent color; hover lift
- `src/lib/components/admin/StatusBadge.svelte` — pill badge for `draft | published | scheduled | archived`; uses `--color-status-*` vars; 0.7rem uppercase font
- `src/lib/components/admin/AdminTable.svelte` — dark table wrapper; `columns: string[]` + default slot for `<tbody>`; `overflow-x: auto`; uses `:global()` for tbody row/cell styles
- `src/lib/components/admin/EmptyState.svelte` — centered empty state; `message`, `sublabel?`, `action?: { label, href }` props; optional CTA link button
- `src/lib/components/admin/Pagination.svelte` — previous/next + page indicator; `currentPage`, `totalPages`, `baseUrl` props; `buildUrl()` preserves existing search params by filtering + re-adding `page` param (avoids `URLSearchParams` mutation lint rule)
- `src/routes/(admin)/+layout.svelte` — full rewrite: 240px fixed sidebar; nav items with correct `/dashboard/*` hrefs; active state = accent left border + lighter bg; sign-out form with `use:enhance`, loading spinner, `goto('/login')` on success; user avatar (initials in accent circle) + name + role; auto icon-only at < 1280px via CSS; mobile drawer (hamburger top bar + `position:fixed` sidebar with `left` transition + backdrop); page title top bar reading `$pageTitle` store; mobile-first responsive
- `src/routes/(admin)/dashboard/+page.server.ts` — new: loads `getDashboardStats()`, returns `{ stats }`, try/catch → 500
- `src/routes/(admin)/dashboard/+page.svelte` — sets `pageTitle` to 'Dashboard' on mount; 4-col primary stat grid (total/published/draft/scheduled) + 3-col secondary (categories/tags/authors); Umami analytics iframe card reading `PUBLIC_UMAMI_SHARE_URL` env var, placeholder if unset; Recent Posts table (last 5 by updatedAt); Top Stories table (last 5 published); all use `<AdminTable>`, `<StatusBadge>`, `<StatCard>`
- `src/routes/(admin)/dashboard/posts/+page.server.ts` — new: reads `status`, `category`, `search`, `page` query params; parallel `getAdminPosts` + `getCategories`; returns posts + pagination metadata + filters + categories; `?/deletePost` action: deletes post by id (cascade handles postTags), returns `fail(400/500)` on error
- `src/routes/(admin)/dashboard/posts/+page.svelte` — sets `pageTitle` to 'Posts'; toolbar with "New Post" accent button + GET filter form (search input, status dropdown, category dropdown); posts table (thumbnail, title+subtitle, category pill, `<StatusBadge>`, date, edit/preview/delete action icons); delete uses `window.confirm` + `use:enhance` with `invalidateAll()` on success + inline error banner on failure; `<EmptyState>` when no results; `<Pagination>` below table with total count label
- `src/routes/(public)/+layout.server.ts` — updated: parallel `getCategories()` + `getSettings()`; passes `umamiWebsiteId`, `gtmId`, `ga4Id`, `metaPixelId` to layout
- `src/routes/(public)/+layout.svelte` — updated: conditionally injects Umami script, GTM snippet, GA4 gtag, Meta Pixel via `{@html}` in `<svelte:head>`; script strings built via concatenation (`'<' + '/script>'` pattern) to avoid `no-useless-escape` lint rule and Svelte parser confusion
- `.env.example` — added `PUBLIC_UMAMI_SHARE_URL` slot
- `wrangler.jsonc` — added `PUBLIC_UMAMI_SHARE_URL` and `UMAMI_WEBSITE_ID` to vars block

**Decisions:**

- `PostStatus` type extended with 'scheduled' without migration — it's a TypeScript-only type assertion on a `text` column, no DB change needed
- `getAdminPosts` uses `and(...conditions)` with `(SQL | undefined)[]` — Drizzle's `and()` filters undefined values, so empty conditions = no WHERE clause (fetch all)
- Admin layout sign-out uses SvelteKit form action (`POST /api/auth/sign-out`) + `use:enhance` rather than Better Auth JS client — avoids creating a separate auth client instance just for sign-out; works without JS too
- `AdminTable` uses `:global()` for tbody row/cell styling since rows are injected via slot and aren't direct children in scoped CSS
- `Pagination.buildUrl()` avoids `new URLSearchParams().set()` mutation pattern (blocked by `svelte/prefer-svelte-reactivity` lint rule) by filtering entries array and rebuilding query string manually
- Tracking script injection uses `{@html}` with `eslint-disable-next-line svelte/no-at-html-tags` comment — acceptable since all injected content is built from server-controlled settings/env values, not user input
- `PUBLIC_UMAMI_SHARE_URL` (the share dashboard URL for the iframe) is a `PUBLIC_` var accessed client-side; `UMAMI_WEBSITE_ID` (the script tracking ID) is server-only, passed through layout server load
- GTM noscript body tag deferred — requires direct `<body>` injection which isn't possible from `<svelte:head>`; noted for future enhancement

**Deferred:**

- GTM `<noscript>` body tag (requires body-level injection, not `<svelte:head>`)
- Post editor (`/dashboard/posts/new` and `[id]/edit`) — Session 7
- Category/tag/author management admin pages — Session 7+
- Author profile public pages
- RSS feed

---

## Session 6 (original log entry) — Category Page, Search & Sitemap

**Date:** 2026-05-20
**Scope:** Category filtered view, site-wide search, navbar wiring, sitemap/robots, DB query additions

**Built:**

- `src/lib/server/queries/posts.ts` — added `getCategoryBySlug(slug)`: fetches single category row by slug with published post count via LEFT JOIN; returns `CategoryWithCount | null`
- `src/lib/server/queries/search.ts` — new: `searchPosts(query, limit=20)`: guards against queries shorter than 2 chars; `ilike` OR across `title`, `subtitle`, `excerpt`; same join/select shape as `getPosts`; returns `PostListItem[]`
- `src/routes/(public)/categories/+page.server.ts` — loads all categories via `getCategories()`; returns SEO data
- `src/routes/(public)/categories/+page.svelte` — 3-col (desktop) / 2-col (mobile) grid of category cards; color swatch strip; name + post count; empty state; links to `/categories/[slug]`
- `src/routes/(public)/categories/[slug]/+page.server.ts` — `getCategoryBySlug` → 404 if null; parallel `getPosts` + `getPostCount`; `?page=N` pagination; try/catch on all DB calls → 500
- `src/routes/(public)/categories/[slug]/+page.svelte` — category hero (color tint bg + 3px color bar, name, post count); 3-col/2-col/1-col responsive post grid via `PostCard variant="grid"`; prev/next pagination (hidden when single page); empty state
- `src/routes/(public)/search/+page.server.ts` — reads `?q` param; returns early with empty state if < 2 chars; `searchPosts` with try/catch; SEO title with query; noindex handled in svelte head
- `src/routes/(public)/search/+page.svelte` — large serif `<form method="GET">` search input pre-filled from `data.query` via `$derived`; three states: no query / no results / results list (single-column); `<meta name="robots" content="noindex">`
- `src/lib/components/blog/Navbar.svelte` — search navigates to `/search?q=` via `goto`; category nav links point to `/categories/[slug]`; added "Categories" link to `/categories`; active state: underline + bold when `currentPath.startsWith('/categories')` or exact `/`; Escape closes search; mobile menu updated with same links
- `src/lib/components/blog/Footer.svelte` — category links now point to `/categories/[slug]`; added "Categories" link; search links to `/search`
- `src/routes/sitemap.xml/+server.ts` — queries all published post slugs + all category slugs; builds XML with home (priority 1.0), categories index + individual category pages (0.8, monthly), posts (0.6, never, lastmod from `updatedAt`); `Cache-Control: public, max-age=3600`
- `src/routes/robots.txt/+server.ts` — `User-agent: *`, allow `/`, disallow `/dashboard /login /api`; Sitemap line using `url.origin`

**Decisions:**

- `searchPosts` duplicates `listSelect`/`toListItem` from `posts.ts` rather than exporting them — avoids coupling two query modules on a shared internal; type duplication is minimal
- `ilike` on `subtitle` and `excerpt` both nullable — Drizzle handles nulls correctly (NULL ILIKE pattern → false), no special case needed
- Search page uses `<form method="GET">` with `value={query}` — no reactive state needed since GET form navigation reloads the page with new data
- `getCategoryBySlug` uses LEFT JOIN (not INNER JOIN) so categories with zero published posts still resolve — avoids 404 for a valid category slug with no live posts
- Sitemap uses `url.origin` from request event (consistent with post page canonical pattern) — no `PUBLIC_SITE_URL` env var needed
- Navbar active state for categories uses `currentPath.startsWith('/categories')` — covers both `/categories` index and `/categories/[slug]` detail
- No pagination on search results (max 20 from `searchPosts`) — MVP scope, noted for future

**Deferred:**

- Admin dashboard — next session
- Author profile pages
- RSS feed (`/rss.xml`)
- Search pagination

---

## Hotfix — Registration Route

**Date:** 2026-05-19
**Scope:** Add missing `/register` page for user account creation

**Built:**

- `src/routes/register/+page.server.ts` — load redirects authenticated users to `/dashboard`; action validates name + email + password + confirm, calls `auth.api.signUpEmail`, redirects to `/dashboard` on success; maps Better Auth errors to user-friendly messages (duplicate email → 409, generic failure → 500)
- `src/routes/register/+page.svelte` — four-field form (name, email, password, confirm); same design tokens and layout as login page; loading state via `use:enhance`; links back to `/login`
- `src/routes/login/+page.svelte` — added "No account? Create one" link to `/register`

**Pre-existing lint fixes (caught during build):**

- `CarouselHero.svelte` — added key `(post.slug)` to `{#each}` dots, used `post.title` in `aria-label` (also better a11y)
- `CategoryPill.svelte` — removed unused `color` prop from `CategoryLike` interface
- `LatestList.svelte` — added key `(post.slug)` to `{#each}`
- `posts/[slug]/+page.svelte` — JSON-LD tag built via string concatenation instead of template literal with `<\/script>` (avoids both the ESLint no-useless-escape and the svelte parser confusion with `</script>` literal)

**Deployed:** `7f0992e` → Cloudflare Pages ✓

**Decisions:**

- Registration is open (no invite gate) for MVP — admin can lock down later
- No automatic author profile creation on register — author rows created separately by admin; decouples identity from authorship
- Used `url.origin` pattern (consistent with post page) rather than `PUBLIC_SITE_URL` — no change needed

---

## Session 5 — Article Page & Post Reading Experience

**Date:** 2026-05-19
**Scope:** Full public article reading experience at `/posts/[slug]` — query additions, all reading components, SEO + JSON-LD, 404 error page

**Built:**

- `src/lib/types/index.ts` — `PostDetail` extended with `id`, `categoryId`, `updatedAt`, `content`, `excerpt`, `tags`
- `src/lib/server/queries/posts.ts` — added `getRelatedPosts(postId, categoryId, limit=3)` (same-category posts, backfills from all categories if < limit); `getPostBySlug` updated to select `id`, `categoryId`, `updatedAt`; imports updated for `ne`, `notInArray`
- `src/lib/server/queries/settings.ts` — new: queries `settings` table rows, returns as `SiteSettings | null`
- `src/app.css` — added full `.prose` block: typography scale (1.125rem/1.8), max-width `--article-w`, h2/h3/blockquote/a/img/strong/ul/ol/hr; `.prose-drop-cap > p:first-of-type::first-letter` — 4.5rem serif, float left, accent color
- `src/lib/components/blog/ReadingProgressBar.svelte` — fixed-top 2px bar; progress calculated from `articleEl.getBoundingClientRect()` (not page height); auto-hides at 0% and 100%
- `src/lib/components/blog/PostContent.svelte` — Tiptap `generateHTML` with StarterKit + Image + Typography; `$derived.by` with try/catch; renders `.prose.prose-drop-cap` wrapper
- `src/lib/components/blog/SocialShare.svelte` — X, WhatsApp, LinkedIn share links (target=\_blank) + Copy Link (clipboard API, "Copied!" feedback, 2s timeout with `onDestroy` cleanup)
- `src/lib/components/blog/TagChip.svelte` — rewritten: `name` prop, `#name` text, `color-mix` border, hover accent
- `src/lib/components/blog/AuthorCard.svelte` — new: `inline` variant (32px avatar + name + role) and `full` variant (64px avatar + serif name + mono role + bio); initials fallback with accent background
- `src/routes/(public)/posts/[slug]/+page.server.ts` — new: 404 if no post; parallel `getRelatedPosts` + `getSettings`; builds SEO data using `url.origin` (no PUBLIC_SITE_URL env var needed)
- `src/routes/(public)/posts/[slug]/+page.svelte` — new: full article layout — CategoryPill, h1, subtitle, AuthorCard inline, AuthorByline, hr, cover image (16:9, eager), PostContent bound to articleEl → ReadingProgressBar; footer: tags, SocialShare, AuthorCard full; related posts grid (3 SmallCard); JSON-LD Article structured data in `<svelte:head>`; full OG/Twitter meta
- `src/routes/+error.svelte` — new: detects 404 vs other errors; 6rem accent status code; themed heading/body/back-link

**Infrastructure fixes:**

- `src/lib/server/db/client.ts` — changed from eager init (threw `DATABASE_URL is not set` during SvelteKit analyse phase) to lazy Proxy singleton; `getInstance()` called on first DB access at request time
- `src/lib/server/auth/index.ts` — same lazy Proxy pattern for Better Auth; prevents `BETTER_AUTH_SECRET` throw during build analyse
- Both changes fix `pnpm build` passing without any secrets in the local environment

**Decisions:**

- Canonical URL uses `url.origin` from SvelteKit `event` rather than `PUBLIC_SITE_URL` env var — eliminates need for `.env` file in local dev; Cloudflare sets the origin correctly in production
- Lazy Proxy for `db` and `auth` — thin wrapper that creates the real instance on first property access; TypeScript types unchanged; all query files and route files need zero changes
- `PostContent` uses Tiptap `generateHTML` SSR-side (no client-side hydration of editor); `@tiptap/extension-typography` for smart quotes/em-dashes
- Reading progress derived from article element's bounding rect, not `document.body.scrollHeight` — accurate when navbar/footer exist outside the article
- Related posts: same-category first, backfill from all categories; uses `notInArray` to avoid duplicates
- `.env` file deleted; project uses only `.dev.vars` for local secrets (Cloudflare convention)

**Deferred:**

- Category browse page (`/categories/[slug]`) — Session 6
- Admin dashboard — Session 7+
- Search functionality
- Author profile pages

---

## Session 4 — Public Layout & V2 Homepage

**Date:** 2026-05-19
**Scope:** Full V2 design implementation — design tokens, dark mode, all public blog components, Navbar, Footer, carousel homepage

**Built:**

- `src/app.html` — added Playfair Display + DM Sans Google Fonts, removed Inter; added anti-flash inline `<script>` to apply `data-theme="dark"` from localStorage before first paint
- `src/app.css` — full V2 design system: CSS custom props (`--cream`, `--ink`, `--ink-60`, `--ink-30`, `--ink-10`, `--accent`, `--accent-light`, `--border`, `--serif`, `--ui`, `--mono`, `--max-w: 896px`, `--article-w: 680px`, `--nav-h: 64px`); dark mode via `[data-theme='dark']`; `@theme {}` block for Tailwind; `@keyframes fadeSlide` + `slideDown` animations; `::selection` accent color
- `src/lib/stores/theme.ts` — `createTheme()` store: reads/writes `open-tabs-theme` in localStorage, toggles `data-theme` on `<html>`
- `src/lib/server/queries/posts.ts` — added `getFeaturedPosts(limit)`: queries `isFeatured = true AND status = 'published'`, falls back to `getPosts` if empty
- `src/routes/(public)/+layout.server.ts` — loads `navCategories` once for the whole public layout
- `src/lib/components/blog/LogoMark.svelte` — _Open_ (italic, `--ink-30`) **Tabs** (bold) + 6px saffron dot + "by Anurag Singh Jakhar" tagline; `size` prop (`sm`/`md`/`lg`)
- `src/lib/components/blog/DarkToggle.svelte` — 38×22px pill toggle, knob slides on `theme` store, sun/moon icon inside knob
- `src/lib/components/blog/TagChip.svelte` — outlined mono chip for tags
- `src/lib/components/blog/SectionHead.svelte` — label + horizontal rule + optional "See all →" link
- `src/lib/components/blog/CategoryPill.svelte` — rewritten: always saffron accent regardless of DB color; `outline` variant for dark backgrounds (carousel)
- `src/lib/components/blog/AuthorByline.svelte` — rewritten: mono font, single-line "Name · Date · Read time", `small` + `dark` variants
- `src/lib/components/blog/PostCard.svelte` — updated to use new `AuthorByline` API (`small` prop)
- `src/lib/components/blog/TrendingCard.svelte` — image (150px) + saffron rank badge + category pill + title + read time
- `src/lib/components/blog/SmallCard.svelte` — image (175px) + category pill + title + 2-line subtitle + byline
- `src/lib/components/blog/LatestList.svelte` — desktop: 3-col table row (date | category+title | read time); mobile: card with category + title + subtitle
- `src/lib/components/blog/CarouselHero.svelte` — full-bleed 520px; `{#key current}` fadeSlide animation; gradient overlay; outline category pill; title/subtitle/byline; dots (active: 22px wide saffron) + prev/next glass buttons; 4500ms auto-advance pauses on hover; `$effect` cleanup
- `src/lib/components/blog/Navbar.svelte` — rewritten: LogoMark + desktop center links (Home + top 5 categories) + search (borderless input) + DarkToggle + "desk" link; mobile: hamburger → slide-down panel with search, all nav links, dark toggle row
- `src/lib/components/blog/Footer.svelte` — rewritten: 2px solid ink top border; 3-col grid (Brand×2 + Topics + Pages); LogoMark; tagline; bottom bar copyright + "Open Tabs."
- `src/routes/(public)/+layout.svelte` — passes `data.navCategories` to both Navbar and Footer; `padding-top: var(--nav-h)` on main
- `src/routes/(public)/+page.server.ts` — rewritten: loads `carouselPosts` (4 featured), `trendingPosts` (4 recent), `latestPosts` (10), `categories`, `categoryDives` (top 2 categories × 3 posts each); returns SEO data
- `src/routes/(public)/+page.svelte` — rewritten: carousel → trending strip → category dive sections → latest list; responsive grid breakpoints

**Decisions:**

- `CategoryPill` simplified to always use saffron `--accent-light/--accent` regardless of per-category DB color — keeps visual consistency with V2 design; DB color field still exists for future use
- No mobile bottom tab bar — V2 design uses hamburger + slide-down menu only
- `getFeaturedPosts` falls back to `getPosts` if no `isFeatured` posts exist — prevents empty carousel on fresh installs
- `CarouselHero` uses `{#key current}` to retrigger animation on slide change, not a transition
- `+layout.server.ts` loads nav categories once for all public pages, not per-page
- `LatestList` uses `formatDate` directly (not AuthorByline) since the desktop layout needs date in a separate column

**Deferred:**

- Article page (`/posts/[slug]`) — Session 5
- Category browse page — Session 5
- Admin dashboard — Session 6+
- Reading progress bar on article pages
- Search functionality (navigates to `/?q=` but no handler yet)

---

## Session 3.5 — Demo Content Seed

**Date:** 2026-05-19
**Scope:** DB only — `isFeatured` column, full seed rewrite with 6 posts, 4 categories, 23 tags; `getFeaturedPost()` updated

**Built:**

- `src/lib/server/db/schema.ts` — added `isFeatured: boolean('is_featured').notNull().default(false)` to `posts` table; imported `boolean` from drizzle-orm/pg-core
- `drizzle/migrations/0002_tiresome_tempest.sql` — migration generated and applied
- `src/lib/server/db/seed.ts` — full rewrite: admin user (Mridushyamal Bose, `mridushyamal@indexdaily.in`), author row (`aut_mridushyamal`, slug `mridushyamal-bose`, dicebear initials avatar), 4 categories with hex colors (Business `#2563EB`, Politics `#7C3AED`, Geopolitics `#059669`, Technology `#D97706`), 23 tags with `tag_` prefix IDs, 6 full Tiptap JSON posts (600–900 words each, IndexDaily voice); `pst_bengal_bjp` marked `isFeatured: true`; fully idempotent via `onConflictDoUpdate`; exits `process.exit(0)` on success, `process.exit(1)` on error
- `src/lib/server/queries/posts.ts` — `getFeaturedPost()` now tries `WHERE isFeatured = true AND status = 'published'` first; falls back to most recent published post

**Posts seeded:**

| ID                           | Title                                                         | Category    | Featured |
| ---------------------------- | ------------------------------------------------------------- | ----------- | -------- |
| `pst_bengal_bjp`             | Bengal 2026: Why the BJP Needs More Than Modi to Win          | Politics    | ✓        |
| `pst_nifty_correction`       | Every Nifty Correction Looks the Same in the Middle           | Business    |          |
| `pst_india_china_border`     | What the LAC Pullback Actually Bought India                   | Geopolitics |          |
| `pst_startup_funding_winter` | Funding Winter Is Over. The Ecosystem Is Not the Same.        | Business    |          |
| `pst_us_tariff_india`        | The US Tariff War Has an India Angle Everyone Is Missing      | Geopolitics |          |
| `pst_lok_sabha_2024_reread`  | One Year After Lok Sabha 2024: What the Result Actually Meant | Politics    |          |

**Decisions:**

- Tiptap content built via `doc()`/`h2()`/`p()`/`bold()`/`quote()` helper functions in seed — no external dep, outputs valid Tiptap JSON serialised as string
- Seed uses `onConflictDoUpdate` on `id` PK for posts/categories/tags/authors, and `onConflictDoNothing` for post-tags (which are deleted and re-inserted instead)
- `isFeatured` added to schema rather than deriving "featured" from any other field — explicit intent is clearer and queryable

**Deferred:**

- Run `pnpm db:seed` locally to populate DB
- `pnpm db:migrate` will run in CI to apply `0002_tiresome_tempest.sql`
- Article page (`/posts/[slug]`) — Session 4

---

## Session 3 — Home Page

**Date:** 2026-05-19
**Scope:** Query layer, blog components (PostCard, CategoryPill, AuthorByline, CategoryFilterBar), fully functional home page with real DB data, SEO

**Built:**

- Schema additions: `categories.color` (nullable text), `authors.slug` (nullable unique text); migration `0001_swift_leo.sql` generated and applied
- `src/lib/server/queries/posts.ts` — full query layer: `getFeaturedPost`, `getPosts`, `getPostBySlug`, `getCategories`, `getPostCount`, `getSiteSettings`; shared `listSelect` shape + `toListItem` transform; all functions fully typed
- `src/lib/utils/format-date.ts` — `formatDate` / `formatDateShort` (en-GB locale: "12 May 2026")
- `src/lib/utils/reading-time.ts` — `calculateReadingTime` for Tiptap JSON content at 200 wpm
- `src/lib/components/blog/CategoryPill.svelte` — hex color bg with WCAG-compliant auto-contrast text; falls back to accent color; `sm`/`md` size variants; optional `href` override
- `src/lib/components/blog/AuthorByline.svelte` — avatar or initials-in-circle + name + formatted date + read time; `sm`/`md` size variants
- `src/lib/components/blog/PostCard.svelte` — `grid` variant (16:9 image, 2-line clamped title/subtitle, byline) + `hero` variant (2-col grid layout, large serif headline, CTA link); image placeholder with faint wordmark; hover lift on grid cards
- `src/lib/components/blog/CategoryFilterBar.svelte` — horizontal scrollable pill row, "All" always first, active state, hidden scrollbar; accepts `getCategoryHref` prop for flexible routing
- `src/routes/(public)/+page.server.ts` — parallel `Promise.all` for featured post, posts, categories, count, settings; reads `?category` and `?page` URL params; returns SEO data
- `src/routes/(public)/+page.svelte` — hero → filter bar → 3-col grid (→ 2-col tablet → 1-col mobile); "Load more stories" paginates via `?page=N`; graceful empty states in serif italic
- `src/routes/(public)/+layout.svelte` — `<svelte:head>` with title, description, canonical, OG tags derived from `page.data.seo`
- `src/lib/types/index.ts` — added `PostListItem`, `PostDetail`, `CategoryWithCount`, `PostAuthor`, `PostCategory`, `SiteSettings` interfaces

**Decisions:**

- Schema added `color` to categories (CategoryPill needs it) and `slug` to authors (future author pages); both nullable to not break existing seeded data
- Query layer uses flat Drizzle `select()` + manual transform rather than relational API — avoids setting up `relations()` config for now; can migrate to relational API in Session 5 if needed
- `CategoryFilterBar` on home page navigates to `/?category=slug` (not `/categories/slug`) since category pages are Session 5; component accepts `getCategoryHref` prop so it can be adapted
- `getPostBySlug` uses 2 queries (post + tags separately) rather than array_agg to avoid raw SQL for the M2M join
- `loadMoreHref()` builds query string manually to avoid Svelte's `no-mutable-class-instance` lint rule for `URLSearchParams`
- `no-useless-assignment` lint rule: `adminUser` in seed.ts changed from `null` init to `undefined` — removes the lint false-positive
- Design URL still 404; all UI built from assumed design tokens

**Deferred:**

- Run `pnpm db:seed` then manually publish a test post to see the home page with real content
- Category page (`/categories/[slug]`) — Session 5
- Article page (`/posts/[slug]`) — Session 4
- Author pages — Session 6+
- `getPostBySlug` used by article page, not yet consumed by any route

**Known Issues:**

- Design URL `https://api.anthropic.com/v1/design/h/BG15xUnH1hBWk15VLrSVpw` still 404. All design assumptions documented.

---

## Session 2 — Database Schema & Authentication

**Date:** 2026-05-19
**Scope:** Full Drizzle schema, Better Auth email/password, admin route guard, login page, seed script, inferred types

**Built:**

- `src/lib/server/db/auth.schema.ts` — Better Auth tables: `user`, `session`, `account`, `verification` (snake_case columns, camelCase JS keys matching Better Auth 1.4.x Drizzle adapter requirements)
- `src/lib/server/db/schema.ts` — blog tables: `categories`, `tags`, `authors`, `posts`, `postTags` (composite PK), `settings`
- `src/lib/server/db/client.ts` — Neon HTTP driver + Drizzle instance; `index.ts` updated to re-export from client.ts
- `drizzle.config.ts` — added `out: './drizzle/migrations'`
- `drizzle/migrations/0000_illegal_terror.sql` — initial migration generated and applied to Neon via CI
- `src/lib/server/auth/index.ts` — Better Auth config with `emailAndPassword`, `drizzleAdapter`, `sveltekitCookies(getRequestEvent)`; exports `Session` and `User` types via `auth.$Infer`
- `src/routes/api/auth/[...all]/+server.ts` — Better Auth catch-all GET/POST handler
- `src/app.d.ts` — `Locals.user: User | null`, `Locals.session: Session | null`
- `src/hooks.server.ts` — attaches user/session to locals via `auth.api.getSession`
- `src/routes/(admin)/+layout.server.ts` — auth guard; redirects unauthenticated requests to `/login`
- `src/routes/(admin)/+layout.svelte` — receives `data.user`, shows user name + sign-out form in sidebar footer
- `src/routes/login/+page.server.ts` — load redirects if already authed; form action calls `auth.api.signInEmail`
- `src/routes/login/+page.svelte` — login form with design tokens, `use:enhance` for loading state
- `src/lib/server/db/seed.ts` — seeds admin user (via auth), default category, tags, author profile, settings
- `src/lib/types/index.ts` — inferred Drizzle types (`User`, `Post`, `Author`, etc.) for all tables
- `package.json` — added `db:seed` script (`node --env-file=.env --import=tsx/esm`)

**Decisions:**

- DB client split into `client.ts`; `index.ts` becomes a re-export barrel so all existing `$lib/server/db` imports stay valid
- `auth.schema.ts` written manually (not regenerated via `pnpm auth:schema`) to ensure correctness with Better Auth 1.4.x
- Seed uses a separate Better Auth instance without `sveltekitCookies` plugin (no request context in script)
- `src/lib/types/index.ts` uses `import type` from `$lib/server/db/schema` — type-only so safe to import from client pages
- Login page uses SvelteKit server action (not client-side auth client) for progressive enhancement
- `env.DATABASE_URL` guard added to `client.ts` after CI flagged `string | undefined` type error (wrangler generates Env without runtime secrets)

**Deferred:**

- `pnpm db:seed` not run yet — run locally once to populate DB with initial admin user and defaults
- Admin dashboard pages (Session 3)
- Post CRUD / Tiptap editor (Session 4+)
- Design URL still 404 — tokens remain assumed

**Known Issues:**

- Design URL `https://api.anthropic.com/v1/design/h/BG15xUnH1hBWk15VLrSVpw` still returns 404. All UI still uses assumed tokens.

---

## Session 1 — Project Foundation

**Date:** 2026-05-19
**Scope:** SvelteKit scaffold, all dependencies, tooling config, design tokens, Navbar, Footer, layouts, placeholder home, wrangler config

**Built:**

- SvelteKit project via `npx sv create` — minimal template, TypeScript strict, Svelte 5 runes mode
- All dependencies installed: adapter-cloudflare, TailwindCSS v4, Drizzle ORM + NeonDB driver, Better Auth, Tiptap (core + starter-kit + image/placeholder/typography/character-count), Resend, Zod, clsx, tailwind-merge, ESLint, Prettier
- `svelte.config.js` — adapter-cloudflare, runes mode enforced
- `vite.config.ts` — @tailwindcss/vite plugin
- `tsconfig.json` — strict mode on, bundler module resolution
- `eslint.config.js` — typescript-eslint + eslint-plugin-svelte + prettier
- `.prettierrc` — useTabs, singleQuote, prettier-plugin-svelte + prettier-plugin-tailwindcss
- `src/app.css` — full design token system: color palette, typography scale, spacing, layout widths, border radius, shadows — all as CSS custom properties under `@theme`
- `src/app.html` — Google Fonts: Playfair Display (display) + Inter (body) via preconnect + stylesheet link
- `src/lib/components/blog/Navbar.svelte` — wordmark, nav links, inline search with keyboard dismiss, scroll-triggered backdrop blur, mobile bottom nav bar
- `src/lib/components/blog/Footer.svelte` — wordmark, tagline, social links (Instagram/YouTube/X), nav links, copyright
- `src/routes/(public)/+layout.svelte` — public layout with Navbar + Footer
- `src/routes/(public)/+page.svelte` — placeholder home: wordmark hero + skeleton post cards
- `src/routes/(admin)/+layout.svelte` — dark sidebar admin layout, collapsible, icon-only below 1024px
- `src/lib/utils/index.ts` — `cn()` utility via clsx + tailwind-merge
- `src/lib/server/auth/index.ts` — Better Auth config (moved from scaffold location)
- `src/lib/server/db/` — Drizzle client + auth schema stub
- `wrangler.jsonc` — name, compatibility_date, R2 bucket binding, PUBLIC_SITE_URL var
- Folder structure: `components/ui/`, `components/blog/`, `components/admin/`, `server/db/`, `server/auth/`, `stores/`, `utils/` all created with `.gitkeep`
- Demo routes removed

**Decisions:**

- Design URL returned 404 — assumed editorial design system: Playfair Display (headings) + Inter (body), cream (#FAFAF7) background, ink (#1A1A18) text, terracotta accent (#C55A3A). Document this assumption for client review.
- TailwindCSS v4 uses `@theme {}` directive for token registration (no tailwind.config.ts needed)
- `src/lib/server/auth.ts` moved to `src/lib/server/auth/index.ts` to match architecture spec
- `layout.css` renamed to `src/app.css` (design token single source of truth)
- `svelte/no-navigation-without-resolve` ESLint rule disabled — incorrectly flags standard `<a href>` component links
- `{@html}` used for hardcoded SVG icon strings in Footer and admin sidebar — safe (no user input), suppressed with eslint-disable block comments
- `pnpm typecheck` script added as alias for `check` (CI uses `pnpm typecheck`)
- `wrangler.jsonc` kept (not renamed to `.toml`) as that is what wrangler generates natively
- `.dev.vars` already in `.gitignore` from Session 0

**Deferred:**

- Design token verification against actual design file — pending client sharing correct URL or design assets
- Real font/color confirmation from design file
- Drizzle schema (Session 2)
- Better Auth full config + session handling (Session 3)
- Real content on home page (Session 4+)

**Known Issues:**

- Design URL `https://api.anthropic.com/v1/design/h/BG15xUnH1hBWk15VLrSVpw` returns 404. Design tokens assumed from editorial conventions. Client must provide correct design assets before Session 4 (Public Layout & Homepage).
- `worker-configuration.d.ts` (wrangler-generated) produces 2 ESLint warnings about unused eslint-disable directives — cosmetic only, generated file, not worth suppressing.

---

## Session 0 — Meta Infrastructure

**Date:** 2026-05-19
**Scope:** CLAUDE.md, docs setup, GitHub Actions CI/CD pipeline, package.json scripts, root config stubs

**Built:**

- `CLAUDE.md` — master instruction file with project overview, folder structure, code quality rules, design fidelity rules, session discipline, env var table, key commands
- `docs/log.md` — this file
- `docs/architecture.md` — living architecture document covering routing, auth flow, upload flow, email flow, analytics, DB overview, secrets
- `docs/sessions.md` — full session roadmap (Sessions 0–11)
- `.github/workflows/deploy.yml` — CI/CD pipeline: typecheck → lint → build → db:migrate → Cloudflare Pages deploy
- `.env.example` — all required env var slots with descriptions
- `.gitignore` — SvelteKit + Node + .env rules
- `package.json` — all required scripts defined (dev, build, preview, typecheck, lint, format, db:generate, db:migrate, db:studio)
- `README.md` — project name, description, links to docs

**Decisions:**

- Used `cloudflare/pages-action@v1` (pinned) for Cloudflare Pages deployment
- DB migration step runs before deploy — if migrations fail, deploy is blocked
- `pnpm` chosen as package manager (SvelteKit default, fast, deterministic)
- Pinned all GitHub Actions to specific SHA or semver tags, not `@latest`
- `PUBLIC_SITE_URL` is the only env var with `PUBLIC_` prefix (client-accessible); all others server-only
- docs/ folder created now so Session 1 can reference architecture decisions immediately

**Deferred:**

- SvelteKit project initialization (Session 1)
- TailwindCSS v4 configuration (Session 1)
- ESLint + Prettier configuration (Session 1)
- Drizzle + NeonDB setup (Session 2)
- Better Auth setup (Session 3)
- All application code

**Known Issues:**

- `package.json` scripts reference binaries not yet installed — will be valid after Session 1 installs dependencies
- `.github/workflows/deploy.yml` uses `wrangler`/Cloudflare Pages action — requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets to be set in GitHub repo settings before first deploy
