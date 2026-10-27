# Design audit — 8 October 2026

Done with the Taste Skill `redesign-skill` checklist (copied to `.agents/skills/redesign-skill/SKILL.md`). Audit only. No site code was changed.

**What was covered:** every public page's code (`src/routes/(public)`, `src/lib/components/blog`, `app.css`, login, register, 404), plus screenshots of home, category, categories, search, login and 404 at 1280px and 390px. Colour contrast was calculated, not guessed.

**Not covered:** admin screens (code only, no screenshots), a real screen-reader test, speed measurements, the live production site (pages were checked on a local copy using a copy of the data), and the design file named in `CLAUDE.md` (its URL still returns 404).

## Already good

- Content has a width limit, no `100vh`, no horizontal scroll on any page tested.
- One accent colour (orange, 75% saturation), warm greys only, no pure black, no purple gradient, no stray dark sections.
- Headings use `text-wrap: balance`, body uses `text-wrap: pretty`.
- A global visible keyboard focus ring, smooth scroll, and `prefers-reduced-motion` is respected.
- Real landmarks (`main`, `nav`, `footer`), custom 404, SVG favicon, no dead `#` links, no Lorem Ipsum, no commented-out code.
- Sign-up and login check input on the server as well as in the browser. The logo on login and register links back home.
- No AI cliché words in the copy. Only two exclamation marks.
- Pills are square, icons are custom SVG (no Lucide or Feather), animation uses `transform`, not width or height.

## Fix first

1. **Category label colours are too faint.** Text is the category colour on a pale tint of itself, at 9px. Ratios need to be 4.5 or more. In light mode all seven fail: Technology 1.93, Renewable Energy 1.97, Economy 2.52, India 2.56, Defence 2.89, Business 3.66, Geopolitics 3.90. In dark mode Business (3.48), Geopolitics (3.25) and Defence (4.33) fail. File: `CategoryPill.svelte`. Fix: darken the text colour automatically until it passes, keep the tint.
2. **The label on top of the hero photo is hard to read.** It's an outline pill in the category colour on a busy photo (`CarouselHero.svelte`). Fix: solid dark background with cream text.
3. **Pictures inside articles have no alt text.** The editor does ask for alt text when an image is inserted, and has an ALT button (added 5 October). But the images in existing posts, such as the Dry Kaveri post, have none, and nothing warns before publishing a post whose images lack it. `tiptap-to-html.ts` then writes `alt=""`. Screen-reader users get nothing, and search and AI tools get less to go on. Fix: a warning before publish, and alt text added to existing posts.
4. **No "skip to content" link.** The first Tab stop is the logo, so keyboard users tab through the whole nav on every page.
5. **No Privacy Policy, Terms, About or Contact page.** The site collects emails (sign-up, newsletter), and the footer only has topics and page links. This is a trust signal for readers, search engines and AI tools, and a privacy notice may be a legal need under India's data protection law. Worth a check with a lawyer. No cookie banner exists. The analytics are privacy-first, so one may not be needed, but confirm.

## Should fix

6. **No "Forgot password"** on the login page, and no reset flow anywhere in the code.
7. **Very small text.** 23 rules use 8 to 10.5px (11 at 10px, 6 at 10.5px, 4 at 9.5px, 1 at 9px, 1 at 8px). Raise the floor to 11px, 12px for labels people need to read.
8. **Card titles are cut off with "…" after two lines.** In the category grid "Dry Kaveri Engine Clears Russian Trials & What It…" loses the part that matters. Files: `PostCard`, `SmallCard`, `LatestList`. Allow three lines for titles, or shorten long titles.
9. **Most buttons give no press feedback.** Hover is nearly everywhere, but `:active` exists only in the hero carousel and the category filter bar.

## Low priority

10. **Title Case headlines** ("What It Means For India") against sentence case everywhere else in the interface. An editorial call for you.
11. **All-caps labels**: 17 rules across 13 files. Most are the deliberate tab labels. Just don't add more.
12. **Exclamation marks** in "Copied!" and "Welcome to Open Tabs, {name}!". Cosmetic.
13. **Admin toast uses `z-index: 9999`.** Not a public issue. A small shared scale would be tidier.
14. **Category pages centre the heading** on a tinted band, while the rest of the site is left-aligned. Taste, not a defect.

## Advice from the skill that should not be applied

The skill is built for generic AI-made sites. These items clash with the brand or with `CLAUDE.md`:

- **Swapping the fonts** (Geist, Satoshi and so on). Playfair Display with DM Sans is the editorial pairing the skill itself recommends, and `CLAUDE.md` says to use the design's fonts only.
- **Grain and noise overlays, photo backgrounds from picsum, parallax stacks, inertia scrolling.** These add weight and distract from reading, and they go against "simplicity first".
- **Breaking up three-column grids.** For lists of articles a grid is the right pattern.
- **Replacing the sun/moon toggle.** It's what readers expect.
- **Making avatars squircles.** Change for its own sake.

## Suggested order

Items 1 to 4 are small, safe and mostly mechanical. Items 3 and 5 also help the SEO and AI-citation goal. Item 5 needs your decision on wording (and a legal check) before I write the pages.
