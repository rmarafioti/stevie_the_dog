# CLAUDE.md — Stevie the Dog

@docs/client-website.md

## Project Overview

The codebase for Stevie the Dog (`https://www.steviethedog.com`), a static website for blogging about my dog. The site owner manages the site's content in the 3D Web Dev Headless CMS: posts today, and more kinds of content as the CMS grows (business hours, for example). This site fetches that content from the CMS's public API and renders it. Everything else on the site (pages, layout, styling) lives in this repo.

- **The site owner** manages CMS content in the CMS dashboard (`https://3dwebdev.com/dashboard`). They never edit that content in this repo.
- **The CMS** stores the content, serves it from its public API (`GET /api/public/posts` today), and calls this site's `POST /api/revalidate` whenever something changes.
- **This repo** renders that content statically and builds every other page of the site.

This site has no login, no database, no user accounts and no user data. Its connection to the CMS is specced in full in `docs/client-website.md`.

Production: this site runs on Vercel at `https://www.steviethedog.com`. The CMS API runs at `https://api.3dwebdev.com`.

## Site Details

Fill this in when the file is copied into a new client repo.

| Detail              | Value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Website name        | Stevie The Dog                                                                              |
| Production URL      | `https://www.steviethedog.com`: the exact URL stored in the CMS, no redirect                |
| Vercel project      | stevie_the_dog                                                                              |
| CMS media folder    | `steviethedog`: this site's upload folder in 3DWD's Cloudinary account, given by the CMS    |
| Static image folder | `stevie_the_dog`: the site's own images (`_data/photos.js`), in the same Cloudinary account |
| CMS content used    | posts → `_components/Blog.jsx`, below the hero on `/`                                       |
| Pages               | `/`: home page (hero photo, intro and the blog)                                             |
| Post links          | new tab (the default), set in `_components/FormattedText.jsx`                               |

## Tech Stack Summary

- Framework: Next.js (current stable, App Router) / JavaScript
- Rendering: static. Server Components by default; CMS content is fetched at build/regeneration time.
- CMS data: one `server-only` `cmsFetch()` plus a `getX()` function per resource, and `src/app/api/revalidate/route.js` for on-demand revalidation
- Images: `next/image`. CMS images come from this site's upload folder in 3DWD's Cloudinary account; the site's own images live in `public/` or in its own Cloudinary folder.
- Testing: Vitest
- Hosting: Vercel

## Project Architecture

```
root
├── src/
│   ├── test/
│   │   ├── setup.js              *stubs server-only; sets the HEADLESS_CMS_* vars to undefined before each test
│   │   └── helpers.js            *mockFetch (the only fake network) and other edge helpers
│   └── app/
│       ├── _components/          *all one-time and reusable components
│       │   ├── Blog.jsx          *Server Component: calls getPosts() and renders the posts below the hero on / (there is no posts route)
│       │   └── FormattedText.jsx *a paragraph's formatting as React elements (copied from the guide)
│       ├── _data/                *optional: the site's own (non-CMS) data
│       │   └── photos.js         *the site's own photos, hosted in the stevie_the_dog Cloudinary folder
│       ├── _hooks/               *client-only UI hooks (e.g. a menu toggle), never CMS data
│       ├── _layout/              *Navbar.jsx and Footer.jsx
│       ├── _lib/
│       │   ├── cmsFetch.js       *the only place the CMS API is called (server-only)
│       │   ├── getPosts.js       *posts: cmsFetch("/api/public/posts", …)
│       │   └── parseParagraph.js *paragraph markup → segments for FormattedText (copied from the guide)
│       ├── _styling/             *all module.css files (page.module.css, Blog.module.css)
│       ├── api/
│       │   └── revalidate/
│       │       └── route.js      *POST only: checks the webhook secret, expires the "cms" tag
│       ├── globals.css           *global styling
│       ├── layout.js             *root layout (Navbar, Footer, site-wide metadata)
│       └── page.js               *home page (hero, intro, Blog)
├── public/                       *the site's own static files and images (or host its images on Cloudinary)
├── docs/
│   └── client-website.md         *the CMS integration guide (copied from the master doc, never edited here)
├── .env.example                  *the three HEADLESS_CMS_* names, empty values
├── .gitignore                    *create-next-app's, plus !.env.example so the example is committed
├── .prettierignore               *docs/client-website.md, so npm run format never edits the guide
├── .prettierrc
├── eslint.config.mjs             *ESLint (Next.js config), run with npm run lint
├── jsconfig.json                 *the `@/*` → `src/*` import alias
├── next.config.mjs               *images.remotePatterns: only this site's Cloudinary folders (docs/client-website.md)
├── vitest.config.mjs             *node environment, @ → src alias, setup file, mocks and stubs reset per test
├── AGENTS.md                     *Next.js agent notes, written and re-added by `next dev`
├── CLAUDE.md                     *project context, loaded automatically every session
└── README.md                     *human-facing overview and local setup
```

*Folders prefixed with an underscore are excluded from routing. Every tested file has its `*.test.js` next to it (see Unit Tests).

## The CMS Integration

`docs/client-website.md` is the source of truth for everything between this site and the CMS: env vars, the response shapes, `cmsFetch()` and the `getX()` functions, rendering rules, the revalidate route, and the Next.js version checks. Follow it exactly.

- It is a copy of the "Client to Website" tab in Rich's master doc. The CMS backend repo is the source of truth for it. **Never edit it in this repo.** If it looks wrong or out of date, tell Rich. The fix is made on the CMS side and the file is copied in again.
- Before writing or changing any caching code, check the installed Next.js version as the guide's "Check the installed Next.js version" section says. Read `AGENTS.md` and the docs bundled in `node_modules/next/dist/docs/`, not memory. Next.js APIs change between versions.

## Project Setup

Set up once when the repo is created, then kept:

- **`.gitignore`:** create-next-app ignores `.env*`, which also hides `.env.example`. Add `!.env.example` so it is committed.
- **`.prettierignore`:** list `docs/client-website.md`, so `npm run format` never edits the guide.
- **`vitest.config.mjs`:** the node environment, the setup file, `resolve.alias` for @ → `src` (Vitest doesn't read the `jsconfig.json` paths), and `mockReset`, `unstubEnvs` and `unstubGlobals` set to true.
- **`src/test/setup.js`:** stubs `server-only`, and sets the three `HEADLESS_CMS_*` vars to undefined in a `beforeEach`, so a real key or secret can never reach a test.
- **npm warning:** npm 11 may warn that `unrs-resolver` (from `eslint-config-next`) has an unapproved postinstall script. It's harmless: the platform binary installs as an optional dependency and lint runs fine.

## Anti-Patterns to Avoid

**Never call the CMS outside `cmsFetch()`:**
`_lib/cmsFetch.js` is the only place the CMS API is called. It adds the API key, the cache tags and the hourly fallback, unwraps `{ data }` and throws on errors. A second fetch to the CMS anywhere else would drift from those rules.

**Never expose the API key or webhook secret:**
`HEADLESS_CMS_API_KEY` and `HEADLESS_CMS_WEBHOOK_SECRET` are `server-only`. Never prefix them with `NEXT_PUBLIC_`, never read them in a Client Component, never commit them, never log them or the Authorization header.

**Never fetch CMS data from the browser:**
No `useEffect` or client-side hook that calls the CMS. `cmsFetch()` imports `server-only`, and only Server Components call the `getX()` functions. A browser fetch would expose the key and render the content after the page loads, which hurts SEO.

**A page that renders CMS content must never quietly become dynamic:**
Fast static pages and SEO are why this site exists. Don't use `cookies()`, `headers()`, `searchParams`, `cache: "no-store"` or `dynamic = "force-dynamic"` on any page that renders CMS content. After any change to one, confirm in the `next build` output that the page is still ○ or ●, not ƒ.

**Never render CMS text as HTML:**
A post paragraph's text is rendered through FormattedText (`docs/client-website.md`, Paragraph formatting), which builds `<b>`, `<i>` and `<a>` elements from its markup. All other CMS text is a plain React text node. Never use `dangerouslySetInnerHTML`. Post paragraphs use `white-space: pre-line` so line breaks show.

**Never render an empty field:**
Optional CMS fields (a post's header, `subHeader`, `postDate`) may be `null`. Skip them; never render "`null`" or an empty heading.

**Never hardcode CMS content:**
Content the CMS manages comes only from the CMS. No sample posts, fallback copy or placeholder content in the repo. With nothing to show, render nothing or the site's chosen empty message.

**Never add a redirect in front of the stored URL:**
The CMS calls the exact URL it has stored. A www ↔ bare-domain redirect drops the Authorization header and breaks revalidation. Domain redirects are set up in Vercel only after checking that the stored URL is the one the site is served on.

**The revalidate route does one thing:**
Check the secret, expire the cms tag, respond. No other work, no logging of the request.

**Never make aesthetic styling decisions:**
No CSS frameworks, no component libraries, no color, font or spacing choices. Styling is owned entirely by Rich. The agent's only layout job is basic structural formatting (flexbox only) to keep content readable. The required styles are functional: `white-space: pre-line` on post paragraphs, so line breaks show; `max-width: 100%; height: auto` on CMS images, so a large photo never overflows its container; and links in post paragraphs keep the browser's underline, because the CMS editor makes links bold by default and they must still read as links.

## Patterns and Preferences

**One shared CMS fetch, one function per resource:**
`cmsFetch(path, { tag, empty })` in `_lib/cmsFetch.js`:

- returns empty when `HEADLESS_CMS_API_URL` is unset, so the site still builds before it is wired up
- sends `GET {HEADLESS_CMS_API_URL}{path}` with `Authorization: Bearer <HEADLESS_CMS_API_KEY>`
- caches with `next: { tags: ["cms", tag], revalidate: 3600 }`: the shared cms tag lets the revalidate route expire every resource at once, and `revalidate: 3600` is the hourly fallback. Keep revalidate on every CMS fetch: the request sends an Authorization header, and Next.js 16 only caches such a request when it has an explicit cache setting
- throws on a non-2xx response, so a failed regeneration keeps the last good page
- returns the unwrapped data

Each CMS resource gets its own function in `_lib/`, named `getX` (`getPosts` today), which calls `cmsFetch` with its path, its own tag and its empty value (`[]` for a list). These play the role per-resource hooks play in a client app, but run only in Server Components. A new `getX` (`getHours`, `getPhotoGallery`) is added only once the CMS serves that data and `docs/client-website.md` specs it. Adding one is a new `getX` file, its rendering per the guide, its test, and a row in Site Details.

**Where CMS content renders is decided per client:**
On its own route (`src/app/news/page.js`) or inside an existing page through a component in `_components/` (for example `Blog.jsx` below the hero on /). Either way it is a Server Component that calls `getX()`, and the page builds static. Record the choice in Site Details.

**`_hooks/` is for client-only UI:**
Hooks there handle browser interaction (a menu toggle, for example) and never fetch CMS data. File names are camelCase prefixed with use.

**Server Components by default:**
Add `"use client"` only to a small interactive island, never to a page or to anything that renders CMS content. No Context or state library unless more than one component actually needs the value.

**Every image goes through `next/image`:**
CMS images use the `src`, `width`, `height` and `altText` the CMS sends (`alt={altText}`), styled `max-width: 100%; height: auto`, and come from this site's upload folder in 3DWD's Cloudinary account (Site Details). The site's own images live in `public/` or in its own Cloudinary folder, and also carry real `width`, `height` and alt.

**The site's own data:**
Data the site uses that isn't CMS content (a list of its own photos, for example) can live in an optional `_data/` folder (`_data/photos.js`).

**Every page has metadata:**
Each page exports metadata with at least a title and description, since search is the reason the site is static.

**Saving notes:**
When Rich asks to save or remember something, write it into the most fitting project md file (`CLAUDE.md` or `README.md`, never `docs/client-website.md`), not only into private memory, so it survives a context clear. In plan mode, where only the plan file can be edited, put the doc edit in the plan.

**File naming:**
Components in PascalCase.jsx, hooks in camelCase.js prefixed with use, everything else camelCase.js, following standard React convention.

**In-line comments:**
Keep all code readable and explicit. Comments explain the logic in more abstract code, and every comment must be validated and true. Each file has a header comment explaining its purpose.

## Out of Scope (do not build)

- Anything that writes to the CMS: no forms, admin pages or editing of CMS content. The site owner uses the CMS dashboard.
- Any CMS endpoint not specced in `docs/client-website.md`.
- Login, user accounts, a database, or storing any visitor data.
- A page per post. The CMS sends `postId` in the revalidate body for when this is wanted later; it isn't built until Rich asks.

## Code Style

Formatting is Prettier with default settings (`.prettierrc`), run before every commit (`npm run format`), plus `npm run lint` clean.

- **File shape, top to bottom:** header comment → `"use client"` if needed → imports (React, then Next, then local) → module constants (`UPPER_SNAKE`) → helpers → the main export. Inside a component: hooks and state → derived values → handlers → JSX.
- **Exports:** components and pages use export default function Name. Hooks and lib functions are named exports (`export function getPosts`).
- **Functions:** function declarations for components, hooks and helpers. Arrows only inline (callbacks, `.map`).
- **Naming:** CMS fetchers are `getX`. Booleans read as questions (`hasPosts`). Use the vocabulary of `docs/client-website.md` (post, body, paragraph, image, link), not synonyms.
- **Control flow:** early returns over nested if/else. No nested ternaries in JSX.
- **Quotes:** Prettier's defaults (double quotes). The guide's snippets already use them, so a copied snippet doesn't change on `npm run format`.

## Code Review

A review is read-only. It produces findings; it never edits code. Fixes are their own task: plan in plan mode, Rich approves, build, verify, PR.

### Checklist

1. **Style is consistent** with Code Style above. If two files do the same thing two ways and neither is documented, raise it as a decision.
2. **No dead code:** unused imports, components, hooks, files, env vars, commented-out code.
3. **Explicit, then DRY:** extract on the third copy, or the second when the copies could drift.
4. **Comments are necessary and true**, and every file keeps an accurate header comment.
5. **Docs match code:** the architecture tree, Site Details, Progress line, `README.md` and `.env.example` describe what is in the repo.
6. **The integration still matches `docs/client-website.md`:** run its "Done when" list against the code.
7. **The Anti-Patterns still hold:** `cmsFetch` only, secrets `server-only`, no browser fetch, static CMS pages, no HTML injection, no empty fields, no hardcoded content, no aesthetic styling.
8. **Every CMS state renders:** nothing returned, optional fields empty, an unknown body type skipped, and each content case the guide lists (for posts: paragraphs only, paragraphs and images interleaved, formatting and links).
9. **Tooling is clean:** `npm test`, `npm run lint`, `npm run format` (no diff) and `npm run build` pass, with every CMS page static.

### Output

Findings as a list, most important first. Each has: file and line, checklist item, what's wrong, proposed fix, and type: **bug**, **cleanup** or **doc**. Anything that needs Rich's style or spec call is marked **decision**, with no fix proposed until he decides.

## Unit Tests

Vitest, node environment. `npm test` runs the suite once; `npm run test:watch` while working. A failing test blocks a commit the same as a failing build.

### What is tested

The CMS boundary, where a mistake breaks the site silently or leaks a secret:

- **`cmsFetch()`:** returns empty when `HEADLESS_CMS_API_URL` is unset, without calling fetch; sends `GET {url}{path}` with `Authorization: Bearer <key>`; passes `next: { tags: ["cms", tag], revalidate: 3600 }`; returns the unwrapped data; throws on a non-2xx response (`401`, `429`, `500`).
- **Each `getX()`:** one test of its wiring: the path, its tag and its empty value.
- **The revalidate route:** `401` with the documented body for a missing header, a wrong secret, and an unset `HEADLESS_CMS_WEBHOOK_SECRET`; `200` and the cms tag expired for the right secret. For the unset-secret case, send a full `Bearer <secret>`, not `"Bearer "` with nothing after it: header values are trimmed, so it arrives as `"Bearer"` and fails on length alone, and the test would pass even with the guard deleted.
- **parseParagraph() and FormattedText:** every row of the rendering examples table in `docs/client-website.md` (Paragraph formatting), rendered and compared with its Output column, with `target="_blank" rel="noopener noreferrer"` added to each expected `<a>` (or left off if Site Details says same tab).
- **A bug that was fixed:** write the failing test first, then fix the code, so it can't come back.

Don't write a test for: static markup, styling, metadata, a constant, or Next.js behaviour itself. Rendering is checked by hand (see Manual testing), apart from paragraph formatting, which follows rules and is tested.

### The pattern every test follows

- **Location and naming:** the test sits next to the file it tests (`cmsFetch.test.js`, `route.test.js`). Shared support lives in `src/test/`. One describe per unit; each it reads as a behaviour sentence: `it("throws when the CMS returns 401")`.
- **Arrange → Act → Assert,** separated by a blank line. One behaviour per test.
- **Test behaviour, not implementation:** assert on what was sent to the CMS (URL, headers, next options) and what came back, or on the route's response, never on internals.
- **Mock only the edges:**
  - The network, through `mockFetch` in `src/test/helpers.js`, which replaces the global fetch. No test calls the real CMS.
  - `revalidateTag` from `next/cache` (`vi.mock`), to assert which tag was expired.
  - `server-only`, stubbed in `src/test/setup.js`, because it throws outside a Next.js server build.
  - Env vars with `vi.stubEnv`, never real values. The real API key and webhook secret never appear in a test.
  - Nothing else in our own code is mocked.
- **Responses come from the contract:** mock bodies use the shapes and messages in `docs/client-website.md`, copied word for word.
- **Independent:** mocks and stubbed env vars reset after each test (`vitest.config.mjs`). Tests pass in any order and alone.
- **No snapshots.**
- **Same rules as the rest of the code:** Code Style and Code Review apply to test files too.

### Manual testing

Rendering and the live loop are tested by hand, as the Testing section of `docs/client-website.md` describes: local rendering against the CMS backend on port 4000, a static `next build`, and a wrong-secret `401` on the deployed route. The CMS operator then runs the webhook and live-update tests from the backend repo. Before the CMS backend is available, a throwaway mock CMS can stand in, as the guide's Testing section describes; it never replaces the test against the real CMS.

Content created in the CMS for testing belongs to the CMS database. List everything a test created (posts, for example) so Rich can have the backend session delete it.

## Workflow Checklist

- Branch from an up-to-date main
- Check the relevant spec (`docs/client-website.md` for anything touching CMS content)
- Create a plan in plan mode (EnterPlanMode / ExitPlanMode), never as a chat message
- On approval, build
- Checks after building:
  - Self-review the diff against Code Review → Checklist
  - `npm test` green; new or changed CMS code has tests per Unit Tests
  - `npm run lint`, `npm run format` and `npm run build` are clean, and every CMS page builds as static
  - Every CMS call goes through `cmsFetch()`
  - No secret is `NEXT_PUBLIC_`, committed, logged or read in a Client Component
  - No aesthetic styling added
  - Verified in the browser (`npm run dev`, then `next start` after a build)
  - Test content listed for deletion
- Only commit once the code is reviewed and approved and every check is green
- Commit, push and open a PR; Rich merges it on GitHub

When Rich says to commit, first update the Progress line below to describe the state after the PR merges, on the same branch. After a merge Rich runs `/clear`, so the next task starts from this file and `docs/` alone. Anything worth keeping must be written here first.

## Progress

Docs synced with the master guide and template (22 October; `docs/client-website.md` byte-identical to the master, and every snippet in it matches its file). CMS integration done and tested against the local CMS: `cmsFetch` (401, 429 and 500 tested), `getPosts`, the revalidate route, and paragraph formatting through `parseParagraph` and `FormattedText` (every rendering example tested; 35 tests). Posts render in `_components/Blog.jsx` below the hero on `/` (static, 1h fallback), with paragraphs formatted and line breaks kept, and links underlined and opening in a new tab. `next/image` loads only from `3dwd/steviethedog/`, `3dwd-dev/steviethedog/` and `stevie_the_dog/`. Locally, the CMS sends its revalidate call to the stored production URL, so after a dashboard change, POST to `localhost:3001/api/revalidate` by hand to see it. Pending the CMS deploy: set the three env vars on Vercel (leave them unset until then, so the build returns no posts instead of failing), check that a deployed wrong-secret POST returns 401, and have the CMS operator run the live test. Test content to delete from the local CMS: "Test Post" (archived, with two images in `3dwd-dev/steviethedog/`), the untitled post with the LinkedIn links, and "welcome home! (edited)".

## Plan Authoring

When in plan mode, write the plan to be legible cold, understandable by someone who never saw the conversation that produced it. State what's being built, which files will be touched, and why this approach was chosen. Spell out what "same pattern as before" or "as discussed" means instead of writing it.

## Delegating to Subagents

Use subagents for research, exploration and investigation for a plan, and for completing smaller tasks.
