# Claude Design brief: Open Tabs public pages

How to use this file: paste everything below the line into Claude Design as your first message. Attach the screenshots and files listed in section 12 if you can. If Claude Design asks questions, answer from this brief and make a decision where it is silent. Note each decision.

---

## 1. What I want

Redesign the public side of **Open Tabs** from scratch. This is a full redesign of layout, typography, colour, components and motion, not a reskin. Keep the name, the content and every feature that exists today (section 6 lists them). The admin dashboard is out of scope for this round.

The look should be **aesthetic, editorial, minimal and memorable**. A reader should be able to recognise an Open Tabs page after one visit, with the logo covered.

## 2. The product

- **Open Tabs** is an explainer blog by IndexDaily Media, Delhi. Founder and main writer: Anurag Singh Jakhar. Most posts carry the byline "Team Index Daily".
- It explains business, politics and geopolitics "through a money lens". Indian focus, global scope. British spelling (Defence, programme).
- Readers are mostly Indian, aged about 20 to 40, mostly on phones. Posts are long reads of 4 to 10 minutes. Treat the mobile reading experience as the main product and make desktop equally polished.
- About 43 published stories today, growing to hundreds. Seven categories. Cover images are painterly 16:9 illustrations (1200 by 630). Some posts may have no cover, so every card and page needs a good no-image state.
- The name is the idea: browser tabs you keep open because you mean to come back to them. The current site already uses tab-shaped section labels and a tab strip on the home hero. Keep this idea, push it further, and use it with discipline.
- Short tagline you can use: "Clarity on business, politics and geopolitics." The tagline in the footer today is "Explainer writing on business, politics, and geopolitics, through a money lens."

## 3. Design direction

- **Editorial.** Typography does the work. A confident serif for headlines, a calm and very readable text face. Rules, spacing and alignment instead of boxes and shadows. Think of a printed magazine page translated to a screen.
- **Minimal.** Few colours, few type sizes, few kinds of component. Every element has a job. No decoration without a function.
- **Memorable.** One signature device, used with restraint, that readers will recognise. My starting point is the tab: the masthead as a tab strip, the page you are on as the open tab, tab-shaped labels. You may propose something better. If you do, explain it in three lines and show it on the home page and the article page.
- **Warm and human.** Paper and ink feel. Not corporate software, not a cluttered news portal, not a Medium clone.
- **Mood references (do not copy):** Aeon, Monocle, The Economist in print, the bold typography of Bloomberg Businessweek, the quiet interface of Are.na.
- **Avoid:** gradients (above all purple or blue), glass effects, drop-shadow card piles, pill badges everywhere, emoji, stock-photo look, icon-library look, everything centred, three equal cards as the only layout, tiny all-caps labels everywhere, dotted carousels, parallax, grain or noise overlays.

## 4. What is fixed

These come from the project rules and from an audit of the current site. Do not break them.

- **Drop cap** on the first paragraph of every article body.
- **Reading progress bar** on article pages: 2 to 3px, accent colour, fixed to the top of the viewport.
- **Widths:** page content max 896px (56rem). Article body text column max 680px. Wide images in an article may break out to about 1100px.
- **Mobile is designed separately** from desktop, not scaled down. Design at 390px wide for mobile and 1280px for desktop. Show a tablet (768px) wherever the layout changes.
- **Light and dark themes**, both fully designed (not just inverted). The site follows the system setting and has a manual toggle.
- **Contrast:** WCAG AA. At least 4.5:1 for normal text, 3:1 for large text and interface parts. Give me the ratio for every text and background pair in the token table.
- **Text size:** nothing below 12px. Article body at least 17px on mobile and 18px on desktop, line height 1.6 to 1.75, 60 to 70 characters per line.
- **Touch targets** at least 44 by 44px. **Visible focus ring** on everything interactive. A **skip to content** link as the first tab stop.
- **Reduced motion:** every animation has a still alternative.
- **Real content:** use the sample content in section 11, not lorem ipsum. Titles can be long (up to about 100 characters) and subtitles up to about 170. Never cut a title off with "..." on a card. Let it wrap to three or four lines or redesign the card.
- **No new features.** Do not add a table of contents, ratings, follow buttons and the like. If you have a strong idea for one, put it on a separate "suggestions" board, away from the main designs.
- **Build constraints** (so what you design can be built): SvelteKit and Tailwind CSS v4, design tokens as CSS custom properties. Fonts from Google Fonts only, at most three families, loaded with `display=swap`. Icons as simple custom inline SVG, no icon library. No heavy JavaScript. Pure CSS for anything that can be pure CSS.

## 5. What is free

Everything else: the colour palette, the typefaces (today Playfair Display, DM Sans and a system monospace; replace them only if the new pairing is clearly better, and say why), the grid, the card shapes, the navigation pattern, the motion, the wordmark lockup. Today the wordmark is "Open" in light italic and "Tabs" in bold, with an orange full stop and a small line "by anurag singh jakhar" under it. Refine or replace it.

**Category colours.** Each category has a colour that I can change in the database. Today they are saturated and hard to read as text: Business #2f6ce4, Defence #ff1900, Economy #3b9bc4, Geopolitics #cf2b02, India #e07016, Renewable Energy #14c011, Technology #d5a110. Propose a new set of eight (seven plus one spare) that suits your palette and passes contrast. Show how they are used. I would like them as small marks (a dot, a stripe, a tab edge) next to dark text, not coloured text on a tinted background.

## 6. Pages and what each must contain

For every page, give me desktop and mobile, light and dark for the home page and the article page, and light only for the rest unless the dark version differs in layout. Show empty, loading and error states where noted.

### 6.1 Site shell (every public page)

- **Navigation bar.** Logo and wordmark that link home. Home. Categories (a dropdown of all categories). Authors (a dropdown of author names). Search (opens an inline field, closes with a cross or Escape). A dark mode toggle. A "Sign in" link when signed out. When signed in: an avatar button with a menu (My profile, Dashboard for admins and authors only, Sign out). Show the current page clearly.
- **Mobile menu.** A hamburger opens a slide-down panel with search, Home, expandable Categories and Authors lists, the theme toggle and sign in or account links.
- **Footer.** Logo and tagline. Topics (all category links). Pages (Home, Categories, Search, Newsletter). Add About, Contact, Privacy policy, Terms and RSS (these pages do not exist yet; section 6.12 covers them). Line: "© 2026 Anurag Singh Jakhar · IndexDaily Media · Delhi".
- **Skip link,** focus styles and a sticky or non-sticky header choice (justify it).

### 6.2 Home

Sections today, in order: a hero with up to five featured stories, a "Trending" strip of four ranked stories, one lane per category that has "show on home" switched on (three stories each, with a link to see all), a "Latest" list of ten, and the newsletter sign-up. There is also a visually hidden page heading.

Redesign the hierarchy and the way these are presented. I want a strong lead story, a clear sense of what is new, and an obvious way into each topic. Keep the same data. Cards show: cover, category, title, subtitle or excerpt, author, date, reading time.

### 6.3 Article (the most important page)

In order: category label, title, subtitle, byline (author avatar or initials, name, role, date like "5 October 2026", reading time like "8 min read"), bookmark button, cover image, **TL;DR box** (new: 3 to 5 short bullet points, optional, shown only when a post has one; design it so it feels part of the page, see the example in section 11), article body, end-of-article mark, tags, share row (X, WhatsApp, LinkedIn, copy link, plus bookmark), author card with full bio, newsletter sign-up, discussion, and "Keep these tabs open" (three related stories).

Article body can contain: second and third level headings, paragraphs with bold and links, bulleted and numbered lists, images (some with no caption), and block quotes. Style all of them. Show a long sample with at least two images and a list.

Discussion: signed-out view with a "Sign in to join the discussion" prompt; signed-in view with a text box (10 to 1000 characters), a Post button and a "Comment posted" confirmation; a list of comments (initials circle, name or @username, date, text); and an empty state "No comments yet. Be the first."

### 6.4 Category page

Category name, story count, optional category colour use, a grid of story cards, and pagination ("Previous", "Page 2 of 4", "Next"). Show a category with three stories, one with ten plus pagination, and an empty one ("No stories in this category yet.").

### 6.5 Topics page (all categories)

Today a plain grid of category swatches with name and story count. Reimagine it as a proper index of the site.

### 6.6 Tag page

A tag heading (shown as #tagname), the story count and a grid of stories. No pagination today. Include the empty state.

### 6.7 Author page

Avatar or initials, name, role, bio, story count, and a grid of their stories. Include the empty state.

### 6.8 Search

A large search field, a prompt state ("What are you looking for? Search across all Open Tabs stories."), a results state with the count and a list of story cards, and a no-results state. Show the mobile keyboard-open layout.

### 6.9 Sign in and Sign up

- **Sign in:** email, password with a show and hide button, Sign in button, link to create an account, an error message area, a loading state. Add a "Forgot password?" link (the reset flow is new; section 6.12).
- **Sign up:** first name and last name side by side, email (with a live "already registered" check), username (live check with "Username available" or "Username is taken"), password with show and hide, an optional checkbox "Send me Open Tabs stories in my inbox", Create account button, link to sign in. Show every field state: default, focus, checking, success, error.

These pages should feel like part of the same publication, not a generic form template.

### 6.10 Newsletter pages

- **Newsletter landing:** headline today "The week's best reads, straight to your inbox.", email field, Subscribe button. States: default, loading, success ("You're on the list. Good reads incoming. Check your inbox for a welcome note."), already subscribed, and "you already have an account, log in to subscribe".
- **Newsletter setup** ("One last step."): a confirmed email chip with "Use a different email", first and last name, username, password, submit, link to log in.
- **Unsubscribe confirmation:** "You've been unsubscribed." with a link back home.
- The **embedded newsletter form** used on the home and article pages, signed-out and signed-in versions.

### 6.11 Profile

- **My profile:** avatar or initials, name, @username, email, "Member since", Edit profile button, newsletter subscribe or unsubscribe button, Sign out button. A dismissible welcome banner for new accounts. Three tabs: Reading history (thumbnail, title, date), Comments (post title and comment text), Saved (saved articles). Each tab needs an empty state.
- **Edit profile:** photo with "Change photo" and an uploading state, first name, last name, username (read-only with a note for reader accounts), email (disabled), Save and Cancel, error banner.

### 6.12 New pages the site needs (design a simple version of each)

- **Text page template** for About, Contact, Privacy policy and Terms. A long-form page with a title, last-updated date and readable headings. Show it with a sample "About" page.
- **Forgot password** and **Reset password** (one email field; then one new password field), including the "check your email" confirmation.

### 6.13 Error and 404

Large status code, a short headline ("This tab has closed." for 404 and "This tab stopped loading." for other errors), one sentence on what to do, and a way back. This is a place to show some personality.

## 7. Components to design as a kit

Buttons (primary, secondary, text link, with default, hover, pressed, focus, disabled and loading states). Text inputs, password input with toggle, checkbox, textarea (all with default, focus, filled, error, success and disabled states). Tab-style label. Category mark. Tag chip. Byline. Avatar (image and initials). Story cards in every variant used (lead, trending, standard, compact list row, grid). Section heading. Pagination. Dropdown menu. Share buttons. Bookmark button (saved and unsaved). Comment. TL;DR box. Newsletter form. Flash banner and error banner. Empty state. Loading skeletons for a card and for an article.

## 8. Tokens I need back

A table I can paste into CSS: colours for light and dark (with contrast ratios), type scale for mobile and desktop (size, line height, letter spacing, weight, family), spacing scale, border widths and radii, shadows (if you use any), motion (durations and easing), breakpoints, and container widths.

## 9. Motion

Small and purposeful, 150 to 250ms, only `transform` and `opacity`. Describe each moment: hover, press, focus, menu open, tab change, page load. Nothing should be needed to understand the page. Respect reduced motion.

## 10. Copy rules

Plain, direct, confident. Sentence case for interface text. No exclamation marks, no emoji, no filler such as "Elevate", "Seamless", "Unleash", "Delve" or "In the world of". Error messages say what went wrong and what to do. Keep the tab voice light: at most one playful line per page, never at the cost of clarity.

## 11. Sample content to use

**Stories (real):**

1. Category: Defence. "Dry Kaveri Engine Clears Russian Trials & What It Means For India". Subtitle: "How abandoning the afterburner turned a four-decade fighter engine setback into a sovereign propulsion breakthrough for stealth drones and naval turbines." Team Index Daily, 5 October 2026, 8 min read.
2. Category: Geopolitics. "Russia's Irkutsk Lab Worker Death: Pneumonia of Unknown Origin or Pneumonic Plague?" Subtitle: "Why the fatal infection of a Russian anti-plague researcher exposes urgent biosecurity gaps, without heralding the next viral pandemic."
3. Category: Geopolitics. "$8 Billion: The Hidden Cash Pile Behind China's Olympic and Asian Games Dominance". Subtitle: "How 415 billion yuan in state-run gambling turnover finances elite athletes, biomechanical labs, and 600,000 village fitness parks." 9 min read. (The live headline has a typo, "Behind Behind". It is corrected here.)
4. Category: Defence. "India's Hidden Space Crisis: How Pakistan and China Built an Unblinking Eye Over India". Subtitle: "While ISRO focuses on prestigious deep-space missions, a quiet orbital realignment has left India's military navigation and border surveillance facing a dangerous asymmetry." 4 min read, 9 June 2026.
5. Category: Technology. "Singapore's FirstDate: Inside Singapore's State-Run Matchmaking Experiment". Subtitle: "As the fertility rate sinks to 0.87, GovTech's FirstDate couples Nobel economics with civil service dating. But can technocracy fix the matrimonial crisis of the golden cage?" 6 min read.

**Categories:** Business, Defence, Economy, Geopolitics, India, Renewable Energy, Technology.

**Example TL;DR for story 1:**

- India's stripped-down Kaveri engine, built without an afterburner, produced 48.5 kN of thrust in tests in Russia. The target was 46 kN.
- Without the afterburner the engine is lighter, cooler and burns less fuel. That is no use for a fighter, which is why Kaveri was dropped from the Tejas in 2008. It does suit a long-range stealth drone.
- First in line is Ghatak, the 13-tonne stealth combat drone. Loyal-wingman drones, ship turbines and cruise missile engines could build on the same work.
- The engine will not power the AMCA fighter, and it is not cleared yet. The regulator CEMILAC still has to review the data, and the engine has yet to be tested inside a Ghatak airframe.

**Article opening for the drop cap:** "India's four-decade effort to build an indigenous military turbofan has achieved its most concrete operational milestone. In late September 2026, defence sources confirmed that the non-afterburning derivative of the Kaveri aero-engine completed an intensive series of high-altitude simulated tests and airborne trials in Russia, generating a peak dry thrust of 48.5 kilonewtons (kN)."

**Author:** Team Index Daily, role "writer". Avatar is a two-letter initials circle today ("TD").

## 12. Attach if you can

Screenshots of the current site (home, a category, an article, search, sign in, 404) at desktop and mobile, so you can see what exists and improve on it. The audit in `docs/design-audit-2026-10-08.md`. This brief.

## 13. Deliverables and order

1. A one-page concept: the signature idea, palette, type pairing, and a short reason for each choice. Wait for my reaction before going further if you can.
2. The token table and component kit.
3. Home and Article, desktop and mobile, light and dark.
4. Category, Topics, Tag, Author, Search.
5. Sign in, Sign up, Forgot and Reset password.
6. Newsletter pages, Profile pages, Text page template, 404.
7. Interaction notes: states, motion, focus order.
8. A short list of the choices you made where this brief was silent.
