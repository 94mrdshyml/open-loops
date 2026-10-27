# Claude Design brief: Open Tabs private pages (reader profile and dashboard)

How to use this file: this is part 2 of the redesign. Part 1 is the public pages brief (`docs/claude-design-brief-public-pages.md`). Use this in the same Claude Design project so the colours, type, tab idea and components carry over. Paste everything below the line as your message. If Claude Design asks questions, answer from this brief and make a decision where it is silent. Note each decision.

---

## 1. What I want

Redesign every page that sits behind a sign-in: the **reader profile** pages and the whole **dashboard** (the place where posts are written and the site is run). This is a full redesign of layout, components and flow, not a reskin. Keep every feature that exists today, except the ones listed in section 4, which are being removed.

The look follows part 1: same palette, type, tab idea and personality. But the private side is a place to work, not to browse. It should be **calm, fast, readable and quiet**, with the writing room feeling almost as good as the published page. Minimal and editorial still apply: type and spacing do the work, boxes and decoration do not.

## 2. The product and the people

Open Tabs is an explainer blog (business, politics, geopolitics) run by a very small team in Delhi. Today: 43 published stories, 1 draft, 7 categories, 234 tags, 2 author profiles, 6 accounts (1 admin, 5 readers), 6 newsletter subscribers. It will grow to hundreds of stories and a few writers.

Three kinds of people sign in:

- **Reader.** Reads, saves stories, comments, may subscribe to the newsletter. Mobile first.
- **Author.** Writes and publishes their own stories. Mostly on a laptop, sometimes on a phone or tablet.
- **Admin.** Runs everything: all posts, comments, categories, tags, authors, users, newsletter, emails, settings. Mostly a laptop.

## 3. Roles and access (as it works today, plus two fixes)

| Area                                                                                | Reader                | Author                                                          | Admin                 |
| ----------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------- | --------------------- |
| Public site and `/profile` (reading history, saved)                                 | yes                   | yes                                                             | yes                   |
| Edit own name, username, photo                                                      | yes (`/profile/edit`) | **no place today (see fix 1)**                                  | **same gap**          |
| Dashboard home                                                                      | sent to `/profile`    | yes                                                             | yes                   |
| Posts                                                                               | no                    | own posts only: list, write, publish, schedule, feature, delete | all posts, any author |
| Comments (moderate), Categories, Tags, Authors, Users, Newsletter, Emails, Settings | no                    | no                                                              | yes                   |

Two gaps to design for:

1. **Authors and admins cannot edit their own name, username or photo.** The profile page tells them to use "Dashboard, Settings, Account", but Settings is admin-only, so authors are bounced. Design a **My account** page that every dashboard user can reach, separate from site Settings.
2. The dashboard menu must show each role only what it can open. Today an author sees "Analytics" in the menu. Analytics is going away (section 4).

## 4. What is being removed: first-party analytics

We are dropping our own analytics (the pageview, visitor, device, country, referrer, search-term and reading-depth tracking we built ourselves). Analytics will live in **Umami Cloud**. Do **not** design any of these:

- The Analytics page.
- Dashboard widgets for traffic: Active now, Pageviews, Unique visitors, Average session, Bounce rate, sparkline, Top posts, Top referrers, Devices, Browsers, Countries, Top searches, Content gaps, Shares by platform.
- The per-user "Activity timeline" on the user detail page.
- The "Errors in the last hour" counter and its menu badge (it came from the same system).

Instead:

- The menu gets one item, **Analytics ↗**, that opens our Umami share link in a new tab. It shows only when a share link is saved in Settings (the field already exists: "Umami Share URL"). If it is not saved, show a quiet hint pointing to Settings.
- The dashboard home is about **content and people**, using numbers we keep in our own database (section 8.3).
- **Logs page:** it reads from the same analytics store, so its future is undecided. Design a compact version (errors, warnings, a filterable table, expandable details) and mark it clearly as "may be removed".

## 5. Design direction

- Same language as part 1. Reuse its tokens and components first. Add dashboard-only parts (tables, filters, sidebars, modals) in the same style.
- **Density with air.** Tables and forms are compact enough to scan 40 rows, with enough spacing to stay readable. Not a dashboard of cards and charts.
- **The editor is the hero.** The post editor should feel like a focused writing room: a wide, calm text area close to how the article will look, with the tools out of the way.
- Hierarchy through type size and weight, thin rules, and one accent. No gradients, glass, heavy shadows or decorative charts. Status uses colour plus a text label, never colour alone.
- Keep a touch of the tab idea (for example tab-style section switches and an "open tab" for the active menu item), but never at the cost of clarity.

## 6. What is fixed

- **Light and dark themes**, both fully designed, with a toggle. Dark mode matters here because people write at night.
- **Accessibility:** WCAG AA contrast (4.5:1 text, 3:1 for large text and interface parts), nothing below 12px, 44px touch targets, visible focus on everything, full keyboard use, status never shown by colour alone, reduced motion respected, labels on every field, errors announced and tied to their field.
- **Responsive.** Desktop (1280) and mobile (390) are both designed, with the tablet (768) shown where the layout changes. The dashboard menu is a sidebar on desktop and a drawer on mobile. Tables become stacked rows or cards on mobile, with the key facts first.
- **Real states:** every list needs empty, loading (skeleton), no-results (filtered), and error states. Every form needs default, focus, filled, error, saving and saved states.
- **Destructive actions** (delete post, category, tag, author, comment, user role changes) use a clear confirmation that names the thing being deleted. Deleting is never one accidental click.
- **Feedback:** toasts for success and failure, plus inline saved badges for autosave.
- **Build constraints:** SvelteKit, Tailwind CSS v4, design tokens as CSS custom properties, Google Fonts only, simple custom inline SVG icons, no heavy JavaScript.
- **No new features** beyond those listed. Ideas go on a separate "suggestions" board.

## 7. Reader pages

### 7.1 My profile (`/profile`)

- Header: avatar (photo or initials), name, @username, email, "Member since 12 May 2026".
- Actions: **Edit profile**, a **newsletter subscribe or unsubscribe** button (show subscribed, not subscribed and loading states), **Sign out**.
- A dismissible **welcome banner** for new accounts: "Welcome to Open Tabs, Asha. Your account has been created." with a second line when they were subscribed to the newsletter at sign-up.
- Three tabs, each with a count where useful, each with an empty state:
  - **Reading history:** thumbnail, title, category, date read. Empty: "You haven't read any posts yet. Start reading."
  - **Comments:** the post title (links to it) and the comment text, trimmed. Empty: "You haven't commented on any posts yet."
  - **Saved:** saved stories as cards. Empty: "No saved articles yet."
- Mobile: tabs stay reachable with one thumb, rows are large tap targets.

### 7.2 Edit profile (`/profile/edit`)

Photo with "Change photo" and an uploading state, first name, last name, username (live "available or taken" check), email (shown, not editable), Save and Cancel, an error banner. Because of the gap in section 3, show how this page looks for a reader (editable) and how it hands authors and admins on to **My account** instead of the dead end it is today.

### 7.3 Account menu in the public header

The avatar menu: My profile, Dashboard (authors and admins only), Sign out. It is part of the part 1 header, but check it works with the new design.

## 8. Dashboard

### 8.1 Shell

- **Desktop:** a sidebar (or top bar if you can justify it) with the logo, then menu items, then the signed-in user with sign out and the theme toggle. The active item is clearly marked. A page title area with a place for the main action on each page ("New post" and similar).
- **Menu for authors:** Dashboard, Posts, My account, Analytics ↗.
- **Menu for admins:** Dashboard, Posts, Comments (with a **pending count badge**), Categories, Tags, Authors, Users, Newsletter, Emails, Settings, My account, Analytics ↗, and Logs (marked as undecided).
- **Mobile:** a top bar with a menu button and the wordmark, and a slide-in drawer with the same items.
- Also design the dashboard **error page**, a **"you can't open this" (403)** page, and a **404**.

### 8.2 Dashboard home (two versions)

Remove all analytics (section 4). Design a calm "morning desk" for each role.

- **Author:** a greeting with their name, their counts (published, drafts, scheduled), a "Continue writing" card for the latest draft, a short list of their recent posts with status, and a clear **New post** button.
- **Admin:** the same content counts for the whole site, **pending comments** (a count with a link to the queue, and the first two or three waiting comments), **scheduled stories** with their times, recent posts, and people numbers from our own data: total accounts, new accounts this period, newsletter subscribers, new subscribers, emails sent, delivered and bounced. Keep the period switch (24h, 7d, 30d, 90d) only if it earns its place. If you drop it, say so.
- A quiet "Open analytics in Umami ↗" link.

### 8.3 Posts list

Search, a status filter (all, draft, published, scheduled, archived), a category filter, a **New post** button. Columns: cover thumbnail, title (admins also see the author, new and small), category, status badge, featured toggle (a star), date (published date, or last updated for drafts), actions (Edit, Preview, Delete). Authors see only their own posts. Empty state, no-results state, and a delete confirmation. On mobile, each post is a stacked row.

### 8.4 Post editor (new and edit): the most important screen

Today: title, subtitle, a URL slug, a rich text editor, a right-hand panel with tabs (**Meta** and **SEO**), publish controls, autosave every 3 seconds with a "Saved" badge, a back link, Preview, and Delete (edit only).

- **Writing area:** large title, subtitle, slug (shown quietly, editable), then the body. The editor's toolbar has: Heading 2, Heading 3, Bold, Italic, Strikethrough, Inline code, Link, Bullet list, Numbered list, Blockquote, Pull quote, Horizontal rule, Insert image (uploads, then asks for alt text), and an **ALT** button that edits alt text on the selected image. Design the toolbar (floating, pinned, or both) and the body so the text looks as close as possible to the published article, including the drop cap, headings, lists and images.
- **Side panel, Meta tab:** author, category, tags (a tag input with suggestions; limit of 5 tags), cover image uploader (upload, preview, replace, remove), "featured" toggle.
- **Side panel, SEO tab:** excerpt with a character count against the search-result length, Open Graph title and description, Twitter title and description, and a live **search result preview and social card preview**.
- **TL;DR panel (planned feature, design the slot):** 3 to 5 short bullet points shown at the top of the article. They will be written by an AI service when a story is published, and the writer can edit them by hand. Design: empty ("No TL;DR yet"), generating, generated (editable bullets, add and remove a bullet), and edited by hand states, with a "Regenerate" action.
- **Publish controls:** status, **Save draft**, **Publish**, **Schedule** (date and time picker), and Unpublish (back to draft). Show clearly what state the story is in and what will happen on each click.
- **Before publishing (new, small):** a gentle checklist that warns, not blocks: missing cover, missing excerpt, missing TL;DR, **images with no alt text**, no category, no tags.
- **Autosave:** show saving, saved (with time), and failed-to-save states. Never lose work. Show what happens if the connection drops.
- **Mobile:** the writing area full width, the side panel as a bottom sheet or separate screen, the toolbar usable above the keyboard.

### 8.5 Comments (admin)

Status tabs (pending, approved, rejected, all) with counts, a search box, and a list. Each comment: who wrote it (name and @username), the story it is on (link, opens in a new tab), date, text, a status badge, and actions: **Approve**, **Reject**, **Delete** (with confirmation). Pending comments should feel like an inbox to clear. Empty state when nothing is waiting: "Nothing to review."

### 8.6 Categories (admin)

A list with colour swatch, name, slug, story count, and whether it is **pinned to the home page**. Add a category inline; edit inline; change colour with a colour picker; **drag to reorder the home page sections** (and a keyboard way to reorder); pin or unpin; delete with confirmation. Use the new category colours from part 1 and show the picker offering that palette first.

### 8.7 Tags (admin)

234 tags and growing, so it must scale: a filter box, sorting by name or by story count, a toggle to hide tags with few stories, inline rename, **merge into another tag** (choose a target, confirm "merge and remove"), delete with confirmation. Show a long list, a filtered list and an empty one.

### 8.8 Authors (admin)

The writer profiles shown on the public site. A list with avatar, name, role, bio preview, story count. **Add and edit in a side panel:** name, bio, role (a dropdown), avatar (today a URL field; design it as an upload with a URL fallback). Delete with confirmation, and a warning when the author has stories.

### 8.9 Users (admin) and user detail

- **List:** name with email, a small newsletter badge, @username, a role badge, joined date, and a **role dropdown** (reader, author, admin) with Save. You cannot change your own role, so show that state. Add a search box and a role filter (new, small: the list will grow). Changing a role to author or admin is a bigger step; add a short confirmation that says what the person will be able to do (new, small).
- **Detail page:** profile card (avatar, name, email, role, joined, newsletter badge), counts for bookmarks and comments, and, in place of the removed Activity timeline, three simple lists from our own data: **recent comments**, **saved stories** and **recently read**.

### 8.10 Newsletter (admin)

Stat tiles (total subscribers, new this month, and subscribers by source), a switch "Ask newsletter opt-in on registration" with a saved badge, a **Compose** button that is disabled with a "Coming soon" note, and a table of recent subscribers (email, name, source, subscribed date). Empty state for no subscribers.

### 8.11 Emails (admin)

Three tabs: **Templates**, **Logs**, **Stats**.

- **Templates:** a Sender section (from name, from email); a Newsletter welcome email (subject, headline, body text, "leave blank to use default", **Send test**, and a live preview); a Registration welcome email (subject; the body is fixed). Show the preview pane in light and dark.
- **Logs:** a table of sent emails (type, recipient, subject, status, time sent). Click opens the **email detail page:** subject as the title, delivery status, details (subject, status, sent at, last updated, provider ID, user ID), an email preview, and two collapsible raw-data views.
- **Stats:** sent, delivered and bounced for a period.

### 8.12 Settings (admin)

Tabs: **General** (site name, tagline), **Integrations** (Google Tag Manager ID, GA4 ID, Meta Pixel ID, **Umami website ID and Umami share URL**), **SEO defaults** (default meta description, default share image URL), **Email** (email service key, which is secret and shown as masked with a hint, and the from address). Each tab has its own Save and a saved confirmation. Keep secret fields obviously secret.

### 8.13 My account (new, every dashboard role)

First name, last name, username (with the live check), photo upload, email (read-only), and the newsletter preference. This is the page that fixes gap 1 in section 3. Keep it short.

### 8.14 Logs (admin, undecided)

Stat tiles for errors, warnings and info in the last 24 hours. Filters: level, event prefix, search, date from and to, and Clear. A table with Time, Level, Event, Route, Duration, Details. A row expands to show the error and the stack trace in a readable monospaced block. Empty state: "Logs will appear once actions are taken."

## 9. Components to design as a kit

Dashboard shell and menu item (default, hover, active, with badge). Page header with title and main action. **Table** (sortable headers, row hover, selected row, sticky header, and its mobile stacked version). **Stat tile.** Status badge for post status (draft, published, scheduled, archived) and comment status (pending, approved, rejected), each with an icon or text as well as colour. Filter bar. Search field. Tabs. Buttons (primary, secondary, danger, text, icon, with loading). Form field with label, hint and error. Text input, textarea, select, checkbox, toggle switch, date and time picker, colour picker, tag input, image uploader. Side panel (drawer). Confirmation modal. Toast. Inline saved badge. Pagination. Empty state. Skeleton. Banner (info, warning, error). Avatar. Drag handle for reordering. Editor toolbar. Search and social preview cards.

## 10. States and feedback to show

For lists: loading, empty, filtered-empty, error. For forms: default, focus, filled, error, saving, saved. For the editor: autosave states, publish checklist warnings, schedule picker. For destructive actions: the confirmation and the result toast.

## 11. Copy rules

Plain, direct, calm. Sentence case. No exclamation marks, no emoji, no filler such as "Oops" or "Seamless". Error messages say what went wrong and what to do ("Couldn't save. Check your connection and try again."). Buttons use verbs ("Publish story", "Save draft", "Approve comment"). Empty states help the person take the next step.

## 12. Sample content

- **People:** Anurag Singh Jakhar (admin, author profile "Team Index Daily", role "writer"); readers such as Asha Menon (@asha) and Rohan Iyer (@rohan).
- **Stories:** "Dry Kaveri Engine Clears Russian Trials & What It Means For India" (Defence, published 5 October 2026); "Russia's Irkutsk Lab Worker Death: Pneumonia of Unknown Origin or Pneumonic Plague?" (Geopolitics); "$8 Billion: The Hidden Cash Pile Behind China's Olympic and Asian Games Dominance" (Geopolitics); "India's Hidden Space Crisis: How Pakistan and China Built an Unblinking Eye Over India" (Defence); a draft titled "How India's rupee defence actually works" (Economy). Show one scheduled story for 12 October, 9:00 am.
- **Categories:** Business, Defence, Economy, Geopolitics, India, Renewable Energy, Technology.
- **Tags:** #isro, #india-china, #defence-manufacturing, #rupee, #semiconductors, #fertility-rate.
- **Comments:** show a pending comment such as "The part about the afterburner finally made this click for me. Do you know when the first flight tests happen?" (from Asha Menon, 7 October 2026).
- **Dashboard numbers:** 43 published, 1 draft, 1 scheduled, 3 pending comments, 6 accounts, 6 subscribers, 18 emails sent, 18 delivered, 0 bounced.

## 13. Deliverables and order

1. The role and menu map for reader, author and admin, as a one-page diagram.
2. Dashboard shell, tokens (reuse part 1), and the dashboard-only component kit.
3. Reader profile and Edit profile, mobile and desktop, light and dark.
4. Author dashboard home, Posts list, and the **Post editor** with all its states, desktop and mobile, light and dark.
5. Admin dashboard home, Comments, Categories, Tags, Authors, Users and user detail.
6. Newsletter, Emails (and email detail), Settings, My account, Logs.
7. Error, 403 and 404 pages. Interaction notes (focus order, motion).
8. A short list of the choices you made where this brief was silent.
